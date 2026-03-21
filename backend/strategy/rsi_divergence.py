import pandas as pd
import pandas_ta as ta
import numpy as np

from config import (
    RSI_PERIOD, LOOKBACK_CANDLES, RSI_THRESHOLD_LONG,
    SL_OFFSET_PCT, TP1_PROFIT_PCT, TP1_CLOSE_RATIO, TP2_PROFIT_PCT,
    TP1_RSI_TARGET_LONG, BB_PERIOD, BB_STD, HAMMER_WICK_RATIO,
)


def compute_rsi(df: pd.DataFrame, period: int = RSI_PERIOD) -> pd.Series:
    """Compute RSI for a DataFrame with 'close' column."""
    return ta.rsi(df["close"], length=period)


def _is_hammer(row, wick_ratio: float = HAMMER_WICK_RATIO) -> bool:
    """Check if a candle is a hammer pattern (long lower wick, small body at top)."""
    o, h, l, c = row["open"], row["high"], row["low"], row["close"]
    body = abs(c - o)
    total_range = h - l
    if total_range == 0:
        return False
    lower_wick = min(o, c) - l
    upper_wick = h - max(o, c)
    # Lower wick must be >= wick_ratio * body, and upper wick must be small
    if body == 0:
        # Doji-like: lower wick should dominate
        return lower_wick >= total_range * 0.6
    return lower_wick >= body * wick_ratio and upper_wick <= body


def find_entry_signals(df_1h: pd.DataFrame, lookback: int = LOOKBACK_CANDLES,
                       rsi_threshold: float = RSI_THRESHOLD_LONG) -> list[dict]:
    """Find RSI bullish divergence (long) entry signals on 1H candles.

    Tightened conditions:
    1. RSI threshold <= 30 (prev low must have RSI < 30)
    2. RSI confirmation: RSI must have dipped below 30 then recovered
    3. Price must touch Bollinger Band lower band
    4. Signal candle must be a hammer pattern
    """
    df = df_1h.copy()
    df["rsi"] = compute_rsi(df)

    # Bollinger Bands
    bb = ta.bbands(df["close"], length=BB_PERIOD, std=BB_STD)
    if bb is not None:
        df["bb_lower"] = bb.iloc[:, 0]  # BBL
    else:
        df["bb_lower"] = np.nan

    signals = []

    for i in range(lookback + 1, len(df) - 1):
        current_close = df.iloc[i]["close"]
        current_rsi = df.iloc[i]["rsi"]

        if pd.isna(current_rsi):
            continue

        window = df.iloc[i - lookback:i]
        min_idx = window["close"].idxmin()
        prev_close = window.loc[min_idx, "close"]
        prev_rsi = window.loc[min_idx, "rsi"]

        if pd.isna(prev_rsi):
            continue

        # --- Condition 1: prev low RSI must be < 30 ---
        if prev_rsi >= rsi_threshold:
            continue

        # --- Condition 2: RSI dipped below 30 then recovered ---
        # Check that at least one candle between prev low and current has RSI <= threshold,
        # and current RSI is above that level (higher low = divergence)
        min_pos = window.index.get_loc(min_idx)
        recent_window = df.iloc[min_pos:i + 1]
        rsi_dipped = (recent_window["rsi"] <= rsi_threshold).any()
        if not rsi_dipped:
            continue

        # --- Price Lower Low ---
        if current_close >= prev_close:
            continue

        # --- RSI Higher Low (bullish divergence) ---
        if current_rsi <= prev_rsi:
            continue

        signal_candle = df.iloc[i]

        # --- Condition 3: Price touches Bollinger Band lower band ---
        bb_lower = signal_candle.get("bb_lower", np.nan)
        if pd.isna(bb_lower) or signal_candle["low"] > bb_lower:
            continue

        # --- Condition 4: Hammer candle pattern ---
        if not _is_hammer(signal_candle):
            continue

        next_candle = df.iloc[i + 1]
        entry_price = next_candle["open"]
        sl_price = signal_candle["low"] * (1 - SL_OFFSET_PCT)

        signals.append({
            "side": "long",
            "signal_idx": i,
            "signal_time": int(signal_candle["timestamp"]),
            "entry_time": int(next_candle["timestamp"]),
            "entry_price": entry_price,
            "sl_price": sl_price,
            "signal_candle_low": signal_candle["low"],
        })

    return signals


def simulate_exit_on_1m(df_1m: pd.DataFrame, entry_price: float, sl_price: float,
                        entry_time_ms: int) -> dict:
    """Simulate long exit logic using 1-minute candles."""
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

    tp1_price = entry_price * (1 + TP1_PROFIT_PCT)
    tp2_price = entry_price * (1 + TP2_PROFIT_PCT)

    for idx, row in candles_1m.iterrows():
        low = row["low"]
        high = row["high"]
        close = row["close"]
        rsi_val = rsi_1m.get(idx, np.nan)

        # SL first (Low → High priority)
        if low <= sl_price:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": sl_price,
                "exit_reason": "SL",
                "tp1_hit": False,
            }

        # TP1: RSI >= 70 or price >= tp1_price
        rsi_hit = not pd.isna(rsi_val) and rsi_val >= TP1_RSI_TARGET_LONG
        price_hit = high >= tp1_price

        if rsi_hit or price_hit:
            tp1_exit_price = min(high, tp1_price) if price_hit else close
            return _simulate_phase2(candles_1m, idx, entry_price, tp2_price, tp1_exit_price)

    last = candles_1m.iloc[-1]
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": False,
    }


def _simulate_phase2(candles_1m: pd.DataFrame, tp1_idx: int,
                     entry_price: float, tp2_price: float,
                     tp1_exit_price: float) -> dict:
    """Phase 2: After TP1, remaining 50% with break-even stop at entry_price."""
    be_stop = entry_price
    tp1_pos = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]
    tp1_row = candles_1m.loc[tp1_idx]

    for idx, row in remaining.iterrows():
        if row["low"] <= be_stop:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": be_stop,
                "exit_reason": "BE",
                "tp1_hit": True,
                "tp1_time": int(tp1_row["timestamp"]),
                "tp1_price": tp1_exit_price,
            }
        if row["high"] >= tp2_price:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": tp2_price,
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
