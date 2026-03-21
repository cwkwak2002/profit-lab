import pandas as pd
import pandas_ta as ta
import numpy as np

from config import (
    RSI_PERIOD, RSI_THRESHOLD, LOOKBACK_CANDLES,
    SL_OFFSET_PCT, TP1_PROFIT_PCT, TP1_RSI_TARGET, TP1_CLOSE_RATIO, TP2_PROFIT_PCT,
)


def compute_rsi(df: pd.DataFrame, period: int = RSI_PERIOD) -> pd.Series:
    """Compute RSI for a DataFrame with 'close' column."""
    return ta.rsi(df["close"], length=period)


def find_entry_signals(df_1h: pd.DataFrame, lookback: int = LOOKBACK_CANDLES,
                       rsi_threshold: float = RSI_THRESHOLD) -> list[dict]:
    """Find RSI bullish divergence entry signals on 1H candles.

    Returns list of signal dicts with:
        - signal_idx: index in df_1h where signal is confirmed
        - entry_time: timestamp of the NEXT candle (entry candle)
        - entry_price: open of the next candle
        - sl_price: low of signal candle - SL_OFFSET_PCT
    """
    df = df_1h.copy()
    df["rsi"] = compute_rsi(df)

    signals = []

    for i in range(lookback + 1, len(df) - 1):
        current_close = df.iloc[i]["close"]
        current_rsi = df.iloc[i]["rsi"]

        if pd.isna(current_rsi) or current_rsi > rsi_threshold:
            continue

        # Look back for a previous low point
        window = df.iloc[i - lookback:i]

        # Find the minimum close in the lookback window
        min_idx = window["close"].idxmin()
        prev_close = window.loc[min_idx, "close"]
        prev_rsi = window.loc[min_idx, "rsi"]

        if pd.isna(prev_rsi):
            continue

        # Condition 1: Price Lower Low
        if current_close >= prev_close:
            continue

        # Condition 2: RSI Higher Low (bullish divergence)
        if current_rsi <= prev_rsi:
            continue

        # Signal confirmed at candle i, enter at candle i+1
        next_candle = df.iloc[i + 1]
        signal_candle = df.iloc[i]

        entry_price = next_candle["open"]
        sl_price = signal_candle["low"] * (1 - SL_OFFSET_PCT)

        signals.append({
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
    """Simulate the exit logic using 1-minute candles.

    Two-phase exit:
    - Phase 1: Full position. Check SL hit or TP1 conditions (RSI>=70 or +2%).
    - Phase 2 (after TP1): Half position. SL moved to entry (break-even). Check TP2 (+5%).

    Returns dict with exit details.
    """
    # Filter 1m candles from entry time onward
    mask = df_1m["timestamp"] >= entry_time_ms
    candles_1m = df_1m.loc[mask]

    if candles_1m.empty:
        return {
            "exit_time": entry_time_ms,
            "exit_price": entry_price,
            "exit_reason": "NO_DATA",
            "tp1_hit": False,
        }

    # Compute RSI on 1m candles
    rsi_1m = compute_rsi(candles_1m)

    tp1_price = entry_price * (1 + TP1_PROFIT_PCT)
    tp2_price = entry_price * (1 + TP2_PROFIT_PCT)

    # Phase 1: Full position
    for idx, row in candles_1m.iterrows():
        low = row["low"]
        high = row["high"]
        close = row["close"]
        rsi_val = rsi_1m.get(idx, np.nan)

        # Check SL first (Low → High priority)
        if low <= sl_price:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": sl_price,
                "exit_reason": "SL",
                "tp1_hit": False,
            }

        # Check TP1: RSI >= 70 or price >= tp1_price
        rsi_hit = not pd.isna(rsi_val) and rsi_val >= TP1_RSI_TARGET
        price_hit = high >= tp1_price

        if rsi_hit or price_hit:
            tp1_exit_price = min(high, tp1_price) if price_hit else close
            # Phase 2: remaining 50% with break-even stop
            result = _simulate_phase2(candles_1m, rsi_1m, idx, entry_price, tp2_price, tp1_exit_price)
            return result

    # If we exhaust all 1m candles without hitting any target, close at last candle
    last = candles_1m.iloc[-1]
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": False,
    }


def _simulate_phase2(candles_1m: pd.DataFrame, rsi_1m: pd.Series,
                     tp1_idx: int, entry_price: float, tp2_price: float,
                     tp1_exit_price: float) -> dict:
    """Phase 2: After TP1, remaining 50% with break-even stop at entry_price."""
    be_stop = entry_price  # break-even stop

    # Iterate from the candle AFTER TP1
    tp1_pos = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]

    tp1_row = candles_1m.loc[tp1_idx]

    for idx, row in remaining.iterrows():
        low = row["low"]
        high = row["high"]

        # Check break-even stop first
        if low <= be_stop:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": be_stop,
                "exit_reason": "BE",
                "tp1_hit": True,
                "tp1_time": int(tp1_row["timestamp"]),
                "tp1_price": tp1_exit_price,
            }

        # Check TP2
        if high >= tp2_price:
            return {
                "exit_time": int(row["timestamp"]),
                "exit_price": tp2_price,
                "exit_reason": "TP2",
                "tp1_hit": True,
                "tp1_time": int(tp1_row["timestamp"]),
                "tp1_price": tp1_exit_price,
            }

    # Timeout: close at last candle
    last = remaining.iloc[-1] if not remaining.empty else tp1_row
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": True,
        "tp1_time": int(tp1_row["timestamp"]),
        "tp1_price": tp1_exit_price,
    }
