import pandas as pd
import pandas_ta as ta
import numpy as np

from config import (
    EMA_FAST, EMA_SLOW, ADX_PERIOD, ADX_ENTRY_MIN, ADX_BLOCK_BELOW,
    EMA_GAP_MIN_PCT, VOLUME_AVG_PERIOD, EMA_TP_RR_RATIO_LONG,
    EMA_TP_RR_RATIO_SHORT, EMA_TP1_CLOSE_RATIO,
)


def find_entry_signals(df_1h: pd.DataFrame, df_15m: pd.DataFrame) -> list[dict]:
    """Find EMA trend-following entry signals (Long + Short).

    Long:
      Trend (1H): 50 EMA > 200 EMA (golden cross) + ADX(14) >= 25.
      Entry (15m): Price pulls back to 15m 50 EMA then breaks above.
    Short:
      Trend (1H): 50 EMA < 200 EMA (death cross) + ADX(14) >= 25.
      Entry (15m): Price bounces above 15m 50 EMA then breaks back below.
    Common:
      Volume must exceed 20-bar average.
      No-Trade Zone: ADX < 20 or EMA gap < 0.5%.
    """
    # --- 1H trend indicators ---
    h = df_1h.copy()
    h["ema_fast"] = ta.ema(h["close"], length=EMA_FAST)
    h["ema_slow"] = ta.ema(h["close"], length=EMA_SLOW)
    adx_df = ta.adx(h["high"], h["low"], h["close"], length=ADX_PERIOD)
    if adx_df is not None:
        h["adx"] = adx_df.iloc[:, 0]
    else:
        h["adx"] = np.nan

    # --- 15m indicators ---
    m = df_15m.copy()
    m["ema50"] = ta.ema(m["close"], length=EMA_FAST)
    m["ema200"] = ta.ema(m["close"], length=EMA_SLOW)
    m["vol_avg"] = m["volume"].rolling(window=VOLUME_AVG_PERIOD).mean()

    signals = []

    for i in range(1, len(m) - 1):
        row = m.iloc[i]
        prev = m.iloc[i - 1]

        if pd.isna(row["ema50"]) or pd.isna(row["ema200"]) or pd.isna(row["vol_avg"]):
            continue

        # --- Match 1H candle for trend check ---
        ts_15m = row["timestamp"]
        h_before = h[h["timestamp"] <= ts_15m]
        if h_before.empty:
            continue
        h_row = h_before.iloc[-1]

        if pd.isna(h_row.get("ema_fast")) or pd.isna(h_row.get("ema_slow")) or pd.isna(h_row.get("adx")):
            continue

        # --- No-Trade Zone ---
        adx_val = h_row["adx"]
        if adx_val < ADX_BLOCK_BELOW:
            continue

        ema_gap_pct = abs(h_row["ema_fast"] - h_row["ema_slow"]) / h_row["ema_slow"]
        if ema_gap_pct < EMA_GAP_MIN_PCT:
            continue

        if adx_val < ADX_ENTRY_MIN:
            continue

        # --- Volume confirmation ---
        if row["volume"] <= row["vol_avg"]:
            continue

        next_candle = m.iloc[i + 1]
        entry_price = next_candle["open"]

        # --- Long: 50 EMA > 200 EMA (정배열) ---
        if h_row["ema_fast"] > h_row["ema_slow"]:
            # Pullback: prev low touched or went below 50 EMA
            pullback = prev["low"] <= prev["ema50"]
            # Breakout: current close above 50 EMA
            breakout = row["close"] > row["ema50"]

            if pullback and breakout:
                sl_price = row["ema200"]  # SL = 15m 200 EMA
                if sl_price >= entry_price:
                    continue
                risk = entry_price - sl_price
                tp1_price = entry_price + risk * EMA_TP_RR_RATIO_LONG

                signals.append({
                    "side": "long",
                    "signal_idx": i,
                    "signal_time": int(row["timestamp"]),
                    "entry_time": int(next_candle["timestamp"]),
                    "entry_price": entry_price,
                    "sl_price": sl_price,
                    "tp1_target": tp1_price,
                    "signal_candle_low": row["low"],
                })

        # --- Short: 50 EMA < 200 EMA (역배열) ---
        elif h_row["ema_fast"] < h_row["ema_slow"]:
            # Bounce: prev high touched or went above 50 EMA
            bounce = prev["high"] >= prev["ema50"]
            # Break below: current close below 50 EMA
            break_below = row["close"] < row["ema50"]

            if bounce and break_below:
                sl_price = row["ema200"]  # SL = 15m 200 EMA (upper)
                if sl_price <= entry_price:
                    continue
                risk = sl_price - entry_price
                tp1_price = entry_price - risk * EMA_TP_RR_RATIO_SHORT

                signals.append({
                    "side": "short",
                    "signal_idx": i,
                    "signal_time": int(row["timestamp"]),
                    "entry_time": int(next_candle["timestamp"]),
                    "entry_price": entry_price,
                    "sl_price": sl_price,
                    "tp1_target": tp1_price,
                    "signal_candle_low": row["low"],
                })

    return signals


def simulate_exit_on_1m(df_1m: pd.DataFrame, entry_price: float, sl_price: float,
                        entry_time_ms: int, tp1_target: float = 0.0,
                        df_15m: pd.DataFrame | None = None,
                        side: str = "long") -> dict:
    """Simulate exit for EMA trend strategy (Long + Short).

    Long SL: 15m 200 EMA breach (low <= EMA200, tracked dynamically).
    Long TP1: 1:2 R:R → close 50%.
    Short SL: 15m 200 EMA breach (high >= EMA200, tracked dynamically).
    Short TP1: 1:1.5 R:R → close 50%.
    Remaining: hold until 15m 50 EMA reverse cross or BE stop.
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

    # Pre-compute 15m EMA values for dynamic SL tracking
    ema200_15m = {}
    ema50_15m = {}
    if df_15m is not None:
        m = df_15m.copy()
        m["ema200"] = ta.ema(m["close"], length=EMA_SLOW)
        m["ema50"] = ta.ema(m["close"], length=EMA_FAST)
        for _, r in m.iterrows():
            ts = int(r["timestamp"])
            if not pd.isna(r["ema200"]):
                ema200_15m[ts] = r["ema200"]
            if not pd.isna(r["ema50"]):
                ema50_15m[ts] = r["ema50"]

    ema200_keys = sorted(ema200_15m.keys())
    ema50_keys = sorted(ema50_15m.keys())

    def _get_latest_ema(keys: list, values: dict, ts: int) -> float | None:
        lo, hi = 0, len(keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if keys[mid] <= ts:
                result = values[keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    is_long = side == "long"
    current_sl = sl_price

    for idx, row in candles_1m.iterrows():
        low = row["low"]
        high = row["high"]
        ts = int(row["timestamp"])

        # Update dynamic SL from 15m 200 EMA
        latest_ema200 = _get_latest_ema(ema200_keys, ema200_15m, ts)
        if latest_ema200 is not None:
            current_sl = latest_ema200

        if is_long:
            # SL check: price falls below 200 EMA
            if low <= current_sl:
                return {
                    "exit_time": ts,
                    "exit_price": current_sl,
                    "exit_reason": "SL",
                    "tp1_hit": False,
                }
            # TP1 check
            if tp1_target > 0 and high >= tp1_target:
                return _simulate_phase2(
                    candles_1m, idx, entry_price, tp1_target, side,
                    ema50_keys, ema50_15m, ema200_keys, ema200_15m,
                )
        else:
            # SL check: price rises above 200 EMA
            if high >= current_sl:
                return {
                    "exit_time": ts,
                    "exit_price": current_sl,
                    "exit_reason": "SL",
                    "tp1_hit": False,
                }
            # TP1 check (target is below entry for short)
            if tp1_target > 0 and low <= tp1_target:
                return _simulate_phase2(
                    candles_1m, idx, entry_price, tp1_target, side,
                    ema50_keys, ema50_15m, ema200_keys, ema200_15m,
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
                     side: str,
                     ema50_keys: list, ema50_15m: dict,
                     ema200_keys: list, ema200_15m: dict) -> dict:
    """Phase 2: After TP1, hold remaining 50% until EMA reverse cross or BE stop."""
    tp1_pos = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]
    tp1_row = candles_1m.loc[tp1_idx]
    be_stop = entry_price

    is_long = side == "long"

    def _get_latest(keys, values, ts):
        lo, hi = 0, len(keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if keys[mid] <= ts:
                result = values[keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    for idx, row in remaining.iterrows():
        ts = int(row["timestamp"])

        if is_long:
            # Break-even stop
            if row["low"] <= be_stop:
                return {
                    "exit_time": ts,
                    "exit_price": be_stop,
                    "exit_reason": "BE",
                    "tp1_hit": True,
                    "tp1_time": int(tp1_row["timestamp"]),
                    "tp1_price": tp1_exit_price,
                }
        else:
            # Short BE: price rises above entry
            if row["high"] >= be_stop:
                return {
                    "exit_time": ts,
                    "exit_price": be_stop,
                    "exit_reason": "BE",
                    "tp1_hit": True,
                    "tp1_time": int(tp1_row["timestamp"]),
                    "tp1_price": tp1_exit_price,
                }

        # EMA reverse cross check
        ema50 = _get_latest(ema50_keys, ema50_15m, ts)
        ema200 = _get_latest(ema200_keys, ema200_15m, ts)
        if ema50 is not None and ema200 is not None:
            if is_long and ema50 < ema200:
                return {
                    "exit_time": ts,
                    "exit_price": row["close"],
                    "exit_reason": "EMA_CROSS",
                    "tp1_hit": True,
                    "tp1_time": int(tp1_row["timestamp"]),
                    "tp1_price": tp1_exit_price,
                }
            elif not is_long and ema50 > ema200:
                return {
                    "exit_time": ts,
                    "exit_price": row["close"],
                    "exit_reason": "EMA_CROSS",
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
