"""UT Bot Strategy (by QuantNomad).

Original idea by HPotter, coded by Yo_adriiiiaan.
QuantNomad cleaned the code, ported it to Pine Script v4,
and converted it into a strategy.

Reference: https://www.tradingview.com/script/n8ss8BID-UT-Bot-Alerts/

Algorithm:
  nLoss = key_value × ATR(atr_period)

  xATRTrailingStop (ratcheting trailing stop):
    If close > prev_stop AND prev_close > prev_stop:
        stop = max(prev_stop, close - nLoss)   ← uptrend: ratchet up
    Elif close < prev_stop AND prev_close < prev_stop:
        stop = min(prev_stop, close + nLoss)   ← downtrend: ratchet down
    Elif close > prev_stop:
        stop = close - nLoss                   ← just crossed above
    Else:
        stop = close + nLoss                   ← just crossed below

  Buy  signal : close crosses ABOVE xATRTrailingStop (price > stop AND prev_close <= prev_stop)
  Sell signal : close crosses BELOW xATRTrailingStop (price < stop AND prev_close >= prev_stop)

Entry timeframe : 1H candles
Exit simulation  : 1m candles with dynamic trailing stop tracking from 1H data
"""

import numpy as np
import pandas as pd
import pandas_ta as ta

from config import (
    UTBOT_KEY_VALUE,
    UTBOT_ATR_PERIOD,
    UTBOT_TP1_RR,
    UTBOT_TP1_CLOSE_RATIO,
)


# ---------------------------------------------------------------------------
# UT Bot trailing stop computation
# ---------------------------------------------------------------------------

def _compute_utbot(df: pd.DataFrame,
                   key_value: float = UTBOT_KEY_VALUE,
                   atr_period: int = UTBOT_ATR_PERIOD) -> pd.DataFrame:
    """Compute xATRTrailingStop and signal columns for the UT Bot indicator.

    Adds columns to a copy of df:
        ut_atr      : ATR(atr_period)
        ut_stop     : xATRTrailingStop (ratcheting trailing stop)
        ut_buy      : True where buy signal fires
        ut_sell     : True where sell signal fires
    """
    df = df.copy()

    atr_series = ta.atr(df["high"], df["low"], df["close"], length=atr_period)
    if atr_series is None:
        df["ut_atr"]  = np.nan
        df["ut_stop"] = np.nan
        df["ut_buy"]  = False
        df["ut_sell"] = False
        return df

    df["ut_atr"] = atr_series.values
    n = len(df)
    close  = df["close"].values
    nloss  = key_value * df["ut_atr"].values

    stop = np.zeros(n)

    for i in range(1, n):
        if np.isnan(nloss[i]):
            stop[i] = stop[i - 1]
            continue

        src      = close[i]
        src_prev = close[i - 1]
        prev_stop = stop[i - 1]

        if src > prev_stop and src_prev > prev_stop:
            stop[i] = max(prev_stop, src - nloss[i])
        elif src < prev_stop and src_prev < prev_stop:
            stop[i] = min(prev_stop, src + nloss[i])
        elif src > prev_stop:
            stop[i] = src - nloss[i]
        else:
            stop[i] = src + nloss[i]

    df["ut_stop"] = stop

    # Crossover / crossunder detection (EMA period=1 → same as close)
    buy  = np.zeros(n, dtype=bool)
    sell = np.zeros(n, dtype=bool)
    for i in range(1, n):
        prev_above = close[i - 1] > stop[i - 1]
        curr_above = close[i]     > stop[i]
        if not prev_above and curr_above:   # crossed above
            buy[i] = True
        elif prev_above and not curr_above:  # crossed below
            sell[i] = True

    df["ut_buy"]  = buy
    df["ut_sell"] = sell
    return df


# ---------------------------------------------------------------------------
# Entry signals (1H)
# ---------------------------------------------------------------------------

def find_entry_signals(df_1h: pd.DataFrame) -> list[dict]:
    """Find UT Bot entry signals on 1H candles (Long + Short).

    Long  : close crosses above xATRTrailingStop (buy signal).
    Short : close crosses below xATRTrailingStop (sell signal).

    Entry  : next candle open after the signal.
    SL     : xATRTrailingStop at signal candle.
    TP1    : UTBOT_TP1_RR × risk from entry.
    """
    h = _compute_utbot(df_1h)

    signals = []

    for i in range(1, len(h) - 1):
        row    = h.iloc[i]
        next_c = h.iloc[i + 1]

        if pd.isna(row["ut_stop"]) or row["ut_stop"] == 0:
            continue

        is_buy  = bool(row["ut_buy"])
        is_sell = bool(row["ut_sell"])

        if not is_buy and not is_sell:
            continue

        entry_price = next_c["open"]
        sl_price    = row["ut_stop"]

        if pd.isna(entry_price) or pd.isna(sl_price):
            continue

        if is_buy:
            if sl_price >= entry_price:
                continue
            risk = entry_price - sl_price
            tp1  = entry_price + UTBOT_TP1_RR * risk
            side = "long"
        else:
            if sl_price <= entry_price:
                continue
            risk = sl_price - entry_price
            tp1  = entry_price - UTBOT_TP1_RR * risk
            side = "short"

        signals.append({
            "side":              side,
            "signal_idx":        i,
            "signal_time":       int(row["timestamp"]),
            "entry_time":        int(next_c["timestamp"]),
            "entry_price":       entry_price,
            "sl_price":          sl_price,
            "tp1_target":        tp1,
            "signal_candle_low": row["low"],
        })

    return signals


# ---------------------------------------------------------------------------
# Exit simulation (1m)
# ---------------------------------------------------------------------------

def simulate_exit_on_1m(
    df_1m: pd.DataFrame,
    entry_price: float,
    sl_price: float,
    entry_time_ms: int,
    tp1_target: float = 0.0,
    df_1h: pd.DataFrame | None = None,
    side: str = "long",
) -> dict:
    """Simulate exit for UT Bot strategy.

    Stop  : dynamic xATRTrailingStop tracked from 1H candles.
    TP1   : UTBOT_TP1_RR × risk → close UTBOT_TP1_CLOSE_RATIO of position.
    Phase 2: hold remaining at BE stop until trailing stop flips (UT_FLIP) or TIMEOUT.
    """
    mask = df_1m["timestamp"] >= entry_time_ms
    candles_1m = df_1m.loc[mask]

    if candles_1m.empty:
        return {
            "exit_time":   entry_time_ms,
            "exit_price":  entry_price,
            "exit_reason": "NO_DATA",
            "tp1_hit":     False,
        }

    # Build lookup: {1H_ts_ms: (ut_stop, is_long_side)} from 1H UT Bot data
    stop_lookup: dict[int, float] = {}
    dir_lookup: dict[int, bool] = {}   # True = price above stop (long-favoured)
    if df_1h is not None:
        h = _compute_utbot(df_1h)
        for _, r in h.iterrows():
            ts = int(r["timestamp"])
            if not pd.isna(r["ut_stop"]) and r["ut_stop"] != 0:
                stop_lookup[ts] = float(r["ut_stop"])
                dir_lookup[ts]  = bool(r["close"] > r["ut_stop"])

    stop_keys = sorted(stop_lookup.keys())

    def _latest(ts: int):
        lo, hi = 0, len(stop_keys) - 1
        idx = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if stop_keys[mid] <= ts:
                idx = mid
                lo  = mid + 1
            else:
                hi  = mid - 1
        if idx is None:
            return None, None
        k = stop_keys[idx]
        return stop_lookup[k], dir_lookup[k]

    is_long    = side == "long"
    current_sl = sl_price

    for row_idx, row in candles_1m.iterrows():
        ts   = int(row["timestamp"])
        low  = row["low"]
        high = row["high"]

        # Update trailing stop from latest 1H value
        ut_stop, price_above = _latest(ts)
        if ut_stop is not None:
            current_sl = ut_stop
            # Detect flip against our position
            if is_long and not price_above:
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "UT_FLIP",
                    "tp1_hit":     False,
                }
            if not is_long and price_above:
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "UT_FLIP",
                    "tp1_hit":     False,
                }

        if is_long:
            if low <= current_sl:
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "SL",
                    "tp1_hit":     False,
                }
            if tp1_target > 0 and high >= tp1_target:
                return _phase2(candles_1m, row_idx, entry_price, tp1_target,
                               side, stop_keys, stop_lookup, dir_lookup, is_long)
        else:
            if high >= current_sl:
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "SL",
                    "tp1_hit":     False,
                }
            if tp1_target > 0 and low <= tp1_target:
                return _phase2(candles_1m, row_idx, entry_price, tp1_target,
                               side, stop_keys, stop_lookup, dir_lookup, is_long)

    last = candles_1m.iloc[-1]
    return {
        "exit_time":   int(last["timestamp"]),
        "exit_price":  last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit":     False,
    }


def _phase2(
    candles_1m: pd.DataFrame,
    tp1_idx,
    entry_price: float,
    tp1_exit_price: float,
    side: str,
    stop_keys: list,
    stop_lookup: dict,
    dir_lookup: dict,
    is_long: bool,
) -> dict:
    """Phase 2: after TP1, hold remaining until UT_FLIP or BE stop."""
    tp1_pos   = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]
    tp1_row   = candles_1m.loc[tp1_idx]
    be_stop   = entry_price

    def _latest(ts: int):
        lo, hi = 0, len(stop_keys) - 1
        idx = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if stop_keys[mid] <= ts:
                idx = mid
                lo  = mid + 1
            else:
                hi  = mid - 1
        if idx is None:
            return None, None
        k = stop_keys[idx]
        return stop_lookup[k], dir_lookup[k]

    for row_idx, row in remaining.iterrows():
        ts = int(row["timestamp"])

        if is_long and row["low"] <= be_stop:
            return {
                "exit_time":   ts,
                "exit_price":  be_stop,
                "exit_reason": "BE",
                "tp1_hit":     True,
                "tp1_time":    int(tp1_row["timestamp"]),
                "tp1_price":   tp1_exit_price,
            }
        if not is_long and row["high"] >= be_stop:
            return {
                "exit_time":   ts,
                "exit_price":  be_stop,
                "exit_reason": "BE",
                "tp1_hit":     True,
                "tp1_time":    int(tp1_row["timestamp"]),
                "tp1_price":   tp1_exit_price,
            }

        ut_stop, price_above = _latest(ts)
        if ut_stop is not None:
            flipped = (is_long and not price_above) or (not is_long and price_above)
            if flipped:
                return {
                    "exit_time":   ts,
                    "exit_price":  row["close"],
                    "exit_reason": "UT_FLIP",
                    "tp1_hit":     True,
                    "tp1_time":    int(tp1_row["timestamp"]),
                    "tp1_price":   tp1_exit_price,
                }

    last = remaining.iloc[-1] if not remaining.empty else tp1_row
    return {
        "exit_time":   int(last["timestamp"]),
        "exit_price":  last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit":     True,
        "tp1_time":    int(tp1_row["timestamp"]),
        "tp1_price":   tp1_exit_price,
    }
