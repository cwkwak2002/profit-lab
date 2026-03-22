import pandas as pd
import pandas_ta as ta
import numpy as np

from config import (
    RSI_PERIOD, LOOKBACK_CANDLES, RSI_THRESHOLD_LONG,
    SL_OFFSET_PCT, TP1_CLOSE_RATIO,
    TP1_RSI_TARGET_LONG, BB_PERIOD, BB_STD,
    HAMMER_WICK_RATIO, ENGULFING_COVER_PCT,
    RSI_TP1_RR_RATIO, EMA_SLOW,
    RSI_RISK_INUNDATION_BARS, RSI_RISK_DEAD_ZONE_PCT,
    RISK_SPIKE_PCT, RISK_SPIKE_COOLDOWN_MS, RISK_BTC_CRASH_PCT,
)
from bisect import bisect_right


def compute_rsi(df: pd.DataFrame, period: int = RSI_PERIOD) -> pd.Series:
    """Compute RSI for a DataFrame with 'close' column."""
    return ta.rsi(df["close"], length=period)


# ---------------------------------------------------------------------------
# Candle pattern helpers
# ---------------------------------------------------------------------------

def _is_hammer(row, wick_ratio: float = HAMMER_WICK_RATIO) -> bool:
    """Hammer: long lower wick, small body at top."""
    o, h, l, c = row["open"], row["high"], row["low"], row["close"]
    body = abs(c - o)
    total_range = h - l
    if total_range == 0:
        return False
    lower_wick = min(o, c) - l
    upper_wick = h - max(o, c)
    if body == 0:
        return lower_wick >= total_range * 0.6
    return lower_wick >= body * wick_ratio and upper_wick <= body


def _is_bullish_engulfing(current, prev, cover_pct: float = ENGULFING_COVER_PCT) -> bool:
    """Bullish engulfing: current bullish candle covers >= cover_pct of prior bearish body."""
    # Prev must be bearish
    if prev["close"] >= prev["open"]:
        return False
    # Current must be bullish
    if current["close"] <= current["open"]:
        return False
    prev_body = prev["open"] - prev["close"]  # positive for bearish
    if prev_body <= 0:
        return False
    current_body = current["close"] - current["open"]
    return current_body >= prev_body * cover_pct


# ---------------------------------------------------------------------------
# Entry signals (4-filter system)
# ---------------------------------------------------------------------------

def find_entry_signals(df_1h: pd.DataFrame, lookback: int = LOOKBACK_CANDLES,
                       rsi_threshold: float = RSI_THRESHOLD_LONG) -> list[dict]:
    """Find RSI bullish divergence entry signals with 4-filter system.

    1. RSI Bullish Divergence: Price Lower Low + RSI Higher Low, at least one RSI < 30.
    2. BB Re-entry: Price touched/breached BB lower, then closed back inside the band.
    3. RSI W-Pattern: RSI crossed below 30 then crossed back above 30.
    4. Candle Confirmation: Hammer OR bullish engulfing.
    """
    df = df_1h.copy()
    df["rsi"] = compute_rsi(df)

    # Bollinger Bands
    bb = ta.bbands(df["close"], length=BB_PERIOD, std=BB_STD)
    if bb is not None:
        df["bb_lower"] = bb.iloc[:, 0]
    else:
        df["bb_lower"] = np.nan

    signals = []

    for i in range(lookback + 1, len(df) - 1):
        current = df.iloc[i]
        current_close = current["close"]
        current_rsi = current["rsi"]

        if pd.isna(current_rsi):
            continue

        window = df.iloc[i - lookback:i]
        min_idx = window["close"].idxmin()
        prev_close = window.loc[min_idx, "close"]
        prev_rsi = window.loc[min_idx, "rsi"]

        if pd.isna(prev_rsi):
            continue

        # === FILTER 1: RSI Bullish Divergence ===
        # Price Lower Low
        if current_close >= prev_close:
            continue
        # RSI Higher Low
        if current_rsi <= prev_rsi:
            continue
        # At least one of the two RSI readings < 30
        if prev_rsi >= rsi_threshold and current_rsi >= rsi_threshold:
            continue

        # === FILTER 2: BB Re-entry ===
        # Look back from current to prev low — price must have touched/breached BB lower
        # and current candle must close inside the band (above bb_lower)
        bb_lower = current.get("bb_lower", np.nan)
        if pd.isna(bb_lower):
            continue

        # Check that somewhere between prev low and now, price touched BB lower
        min_pos = df.index.get_loc(min_idx)
        search_range = df.iloc[min_pos:i + 1]
        bb_touched = False
        for _, sr in search_range.iterrows():
            sr_bb = sr.get("bb_lower", np.nan)
            if not pd.isna(sr_bb) and sr["low"] <= sr_bb:
                bb_touched = True
                break
        if not bb_touched:
            continue

        # Current candle must close back inside the band
        if current_close <= bb_lower:
            continue

        # === FILTER 3: RSI W-Pattern (30 re-cross) ===
        # RSI must have been below 30, then crossed back above 30
        rsi_below = False
        rsi_recross = False
        for _, sr in search_range.iterrows():
            sr_rsi = sr.get("rsi", np.nan)
            if pd.isna(sr_rsi):
                continue
            if sr_rsi < rsi_threshold:
                rsi_below = True
            elif rsi_below and sr_rsi >= rsi_threshold:
                rsi_recross = True
                break
        if not rsi_recross:
            continue

        # === FILTER 4: Candle Confirmation ===
        prev_candle = df.iloc[i - 1]
        if not _is_hammer(current) and not _is_bullish_engulfing(current, prev_candle):
            continue

        # --- Build signal ---
        next_candle = df.iloc[i + 1]
        entry_price = next_candle["open"]
        sl_price = current["low"] * (1 - SL_OFFSET_PCT)

        # Skip if SL is above or equal to entry
        if sl_price >= entry_price:
            continue

        risk = entry_price - sl_price
        tp1_price = entry_price + risk * RSI_TP1_RR_RATIO

        signals.append({
            "side": "long",
            "signal_idx": i,
            "signal_time": int(current["timestamp"]),
            "entry_time": int(next_candle["timestamp"]),
            "entry_price": entry_price,
            "sl_price": sl_price,
            "tp1_target": tp1_price,
            "signal_candle_low": current["low"],
        })

    return signals


# ---------------------------------------------------------------------------
# RSI-specific risk filters
# ---------------------------------------------------------------------------

def prepare_rsi_risk_context(
    df_1h: pd.DataFrame,
    df_1m: pd.DataFrame | None = None,
    btc_df_1h: pd.DataFrame | None = None,
    symbol: str = "",
) -> dict:
    """Pre-compute context for RSI-specific risk filters."""
    ctx: dict = {}

    # 1H EMA 200 for dead zone
    h = df_1h.copy()
    h["ema200"] = ta.ema(h["close"], length=EMA_SLOW)
    h["rsi"] = compute_rsi(h)
    ctx["h"] = h

    # 1m spike detection
    if df_1m is not None:
        m1 = df_1m.copy()
        m1["pct_5"] = m1["close"].pct_change(5).abs()
        spike_mask = m1["pct_5"] >= RISK_SPIKE_PCT
        ctx["spike_times"] = sorted(m1.loc[spike_mask, "timestamp"].tolist())
    else:
        ctx["spike_times"] = []

    # BTC 1H returns
    if btc_df_1h is not None:
        b = btc_df_1h.copy()
        b["ret_1h"] = b["close"].pct_change()
        ctx["btc_1h"] = b
    else:
        ctx["btc_1h"] = None

    ctx["symbol"] = symbol
    return ctx


def should_block_rsi_signal(signal: dict, ctx: dict) -> tuple[bool, str]:
    """RSI-specific risk filters. Returns (blocked, reason_code)."""
    entry_ts = signal["entry_time"]

    h = ctx["h"]
    h_before = h[h["timestamp"] <= entry_ts]
    if h_before.empty:
        return False, ""

    hr = h_before.iloc[-1]

    # --- Filter 1: Volatility Spike (5 min 3%+ → 60 min cooldown) ---
    spike_times = ctx.get("spike_times", [])
    if spike_times:
        cooldown_start = entry_ts - RISK_SPIKE_COOLDOWN_MS
        idx = bisect_right(spike_times, entry_ts) - 1
        if idx >= 0 and spike_times[idx] >= cooldown_start:
            return True, "RISK_SPIKE"

    # --- Filter 2: RSI Inundation (RSI < 30 for 10+ consecutive bars) ---
    if len(h_before) >= RSI_RISK_INUNDATION_BARS:
        recent = h_before.iloc[-RSI_RISK_INUNDATION_BARS:]
        rsi_vals = recent["rsi"]
        if rsi_vals.notna().all() and (rsi_vals < RSI_THRESHOLD_LONG).all():
            return True, "RISK_RSI_INUNDATION"

    # --- Filter 3: BTC Guard (BTC 1H -5%+ → no altcoin longs) ---
    btc_1h = ctx.get("btc_1h")
    symbol = ctx.get("symbol", "")
    if btc_1h is not None and symbol != "BTC":
        btc_before = btc_1h[btc_1h["timestamp"] <= entry_ts]
        if not btc_before.empty:
            btc_ret = btc_before.iloc[-1].get("ret_1h")
            if not pd.isna(btc_ret) and btc_ret <= RISK_BTC_CRASH_PCT:
                return True, "RISK_BTC_CRASH"

    # --- Filter 4: Dead Zone (price too far below 200 EMA) ---
    ema200 = hr.get("ema200")
    if not pd.isna(ema200) and ema200 > 0:
        distance_pct = (hr["close"] - ema200) / ema200
        if distance_pct < -RSI_RISK_DEAD_ZONE_PCT:
            return True, "RISK_DEAD_ZONE"

    return False, ""


# ---------------------------------------------------------------------------
# Exit simulation
# ---------------------------------------------------------------------------

def simulate_exit_on_1m(df_1m: pd.DataFrame, entry_price: float, sl_price: float,
                        entry_time_ms: int, tp1_target: float = 0.0,
                        df_15m: pd.DataFrame | None = None) -> dict:
    """Simulate long exit using 1m candles.

    SL: signal candle low - 0.5%.
    TP1 (50%): RSI >= 70 OR R:R 1.5x → move SL to break-even.
    TP2 (50%): 15m 200 EMA touch.
    """
    mask = df_1m["timestamp"] >= entry_time_ms
    candles_1m = df_1m.loc[mask]

    if candles_1m.empty:
        return {
            "exit_time": entry_time_ms,
            "exit_price": entry_price,
            "exit_reason": "NO_DATA",
            "tp1_hit": False,
        }

    rsi_1m = compute_rsi(candles_1m)

    # Pre-compute 15m 200 EMA for TP2
    ema200_15m = {}
    if df_15m is not None:
        m = df_15m.copy()
        m["ema200"] = ta.ema(m["close"], length=EMA_SLOW)
        for _, r in m.iterrows():
            ts = int(r["timestamp"])
            if not pd.isna(r["ema200"]):
                ema200_15m[ts] = r["ema200"]

    ema200_keys = sorted(ema200_15m.keys())

    def _get_latest_ema(ts: int) -> float | None:
        lo, hi = 0, len(ema200_keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if ema200_keys[mid] <= ts:
                result = ema200_15m[ema200_keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    for idx, row in candles_1m.iterrows():
        low = row["low"]
        high = row["high"]
        close = row["close"]
        ts = int(row["timestamp"])
        rsi_val = rsi_1m.get(idx, np.nan)

        # SL first
        if low <= sl_price:
            return {
                "exit_time": ts,
                "exit_price": sl_price,
                "exit_reason": "SL",
                "tp1_hit": False,
            }

        # TP1: RSI >= 70 or R:R 1.5x target
        rsi_hit = not pd.isna(rsi_val) and rsi_val >= TP1_RSI_TARGET_LONG
        price_hit = tp1_target > 0 and high >= tp1_target

        if rsi_hit or price_hit:
            tp1_exit_price = min(high, tp1_target) if price_hit else close
            return _simulate_phase2(
                candles_1m, idx, entry_price, tp1_exit_price,
                ema200_keys, ema200_15m,
            )

    last = candles_1m.iloc[-1]
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": False,
    }


def _simulate_phase2(candles_1m: pd.DataFrame, tp1_idx: int,
                     entry_price: float, tp1_exit_price: float,
                     ema200_keys: list, ema200_15m: dict) -> dict:
    """Phase 2: After TP1, remaining 50% with BE stop.
    TP2: 15m 200 EMA touch.
    """
    be_stop = entry_price
    tp1_pos = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]
    tp1_row = candles_1m.loc[tp1_idx]

    def _get_latest(ts: int) -> float | None:
        lo, hi = 0, len(ema200_keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if ema200_keys[mid] <= ts:
                result = ema200_15m[ema200_keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    for idx, row in remaining.iterrows():
        ts = int(row["timestamp"])

        # BE stop
        if row["low"] <= be_stop:
            return {
                "exit_time": ts,
                "exit_price": be_stop,
                "exit_reason": "BE",
                "tp1_hit": True,
                "tp1_time": int(tp1_row["timestamp"]),
                "tp1_price": tp1_exit_price,
            }

        # TP2: 15m 200 EMA touch
        ema200 = _get_latest(ts)
        if ema200 is not None and row["high"] >= ema200:
            return {
                "exit_time": ts,
                "exit_price": ema200,
                "exit_reason": "TP2",
                "tp1_hit": True,
                "tp1_time": int(tp1_row["timestamp"]),
                "tp1_price": tp1_exit_price,
            }

    last = remaining.iloc[-1] if not remaining.empty else tp1_row
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": True,
        "tp1_time": int(tp1_row["timestamp"]),
        "tp1_price": tp1_exit_price,
    }
