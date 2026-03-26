"""SuperTrend Strategy (based on KivancOzbilgic's open-source Pine Script indicator).

Reference: https://www.tradingview.com/script/VLWVV9oU-SuperTrend/

Algorithm:
  - Source : hl2 = (high + low) / 2
  - ATR    : Wilder's ATR(length)
  - Upper band (dn): src + multiplier * ATR   ← resistance / short stop
  - Lower band (up): src - multiplier * ATR   ← support   / long stop

Trailing logic (ratchet):
  up  = max(up,  prev_up)  when prev_close >  prev_up   (never lower the long stop)
  dn  = min(dn,  prev_dn)  when prev_close <  prev_dn   (never raise the short stop)

Trend flips:
  -1 → +1 : close crosses above dn (bearish band)  → BUY signal
  +1 → -1 : close crosses below up (bullish band)  → SELL signal

The active SuperTrend line (SUPERT) equals:
  up  when trend == +1 (lower trailing stop for longs)
  dn  when trend == -1 (upper trailing stop for shorts)

Entry timeframe : 1H candles
Exit simulation  : 1m candles with dynamic SuperTrend stop tracking
"""

import numpy as np
import pandas as pd
import pandas_ta as ta

from config import (
    ST_ATR_PERIOD,
    ST_MULTIPLIER,
    ST_TP1_RR,
    ST_TP1_CLOSE_RATIO,
)


# ---------------------------------------------------------------------------
# SuperTrend computation
# ---------------------------------------------------------------------------

def _compute_supertrend(df: pd.DataFrame, length: int = ST_ATR_PERIOD,
                         multiplier: float = ST_MULTIPLIER) -> pd.DataFrame:
    """Compute SuperTrend indicator on a DataFrame with OHLCV columns.

    Returns df with added columns:
        st_value   : active SuperTrend line (trailing stop)
        st_dir     : direction (+1 bullish, -1 bearish)
        st_up      : lower band (long stop)
        st_dn      : upper band (short stop)
    """
    result = ta.supertrend(
        df["high"], df["low"], df["close"],
        length=length, multiplier=multiplier,
    )

    if result is None or result.empty:
        df = df.copy()
        df["st_value"] = np.nan
        df["st_dir"] = np.nan
        df["st_up"] = np.nan
        df["st_dn"] = np.nan
        return df

    # pandas_ta column names: SUPERT_<L>_<M>, SUPERTd_<L>_<M>, etc.
    col_val = f"SUPERT_{length}_{float(multiplier)}"
    col_dir = f"SUPERTd_{length}_{float(multiplier)}"
    col_up  = f"SUPERTl_{length}_{float(multiplier)}"  # long (lower) line
    col_dn  = f"SUPERTs_{length}_{float(multiplier)}"  # short (upper) line

    df = df.copy()
    df["st_value"] = result[col_val].values if col_val in result.columns else np.nan
    df["st_dir"]   = result[col_dir].values if col_dir in result.columns else np.nan
    df["st_up"]    = result[col_up].values  if col_up  in result.columns else np.nan
    df["st_dn"]    = result[col_dn].values  if col_dn  in result.columns else np.nan
    return df


# ---------------------------------------------------------------------------
# Entry signals (1H)
# ---------------------------------------------------------------------------

def find_entry_signals(df_1h: pd.DataFrame) -> list[dict]:
    """Find SuperTrend entry signals on 1H candles (Long + Short).

    Long  : SuperTrend flips from -1 to +1 (buy signal) — trend turns bullish.
    Short : SuperTrend flips from +1 to -1 (sell signal) — trend turns bearish.

    Entry  : next candle open after the flip.
    SL     : SuperTrend line (active trailing stop) at signal candle.
    TP1    : ST_TP1_RR × risk from entry.
    """
    h = _compute_supertrend(df_1h)

    signals = []

    for i in range(1, len(h) - 1):
        curr = h.iloc[i]
        prev = h.iloc[i - 1]
        next_c = h.iloc[i + 1]

        if pd.isna(curr["st_dir"]) or pd.isna(prev["st_dir"]):
            continue

        curr_dir = int(curr["st_dir"])
        prev_dir = int(prev["st_dir"])

        # No flip → skip
        if curr_dir == prev_dir:
            continue

        entry_price = next_c["open"]
        sl_price    = curr["st_value"]  # active trailing stop at signal candle

        if pd.isna(sl_price) or pd.isna(entry_price):
            continue

        if curr_dir == 1:
            # Bullish flip → Long
            if sl_price >= entry_price:
                continue  # degenerate: stop above entry
            risk    = entry_price - sl_price
            tp1     = entry_price + ST_TP1_RR * risk
            side    = "long"
        else:
            # Bearish flip → Short
            if sl_price <= entry_price:
                continue  # degenerate: stop below entry
            risk    = sl_price - entry_price
            tp1     = entry_price - ST_TP1_RR * risk
            side    = "short"

        signals.append({
            "side":             side,
            "signal_idx":       i,
            "signal_time":      int(curr["timestamp"]),
            "entry_time":       int(next_c["timestamp"]),
            "entry_price":      entry_price,
            "sl_price":         sl_price,
            "tp1_target":       tp1,
            "signal_candle_low": curr["low"],
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
    """Simulate exit for SuperTrend strategy.

    Stop : dynamic SuperTrend trailing stop tracked from 1H candles.
    TP1  : ST_TP1_RR × risk → close ST_TP1_CLOSE_RATIO of position.
    Phase 2: hold remaining at BE stop until SuperTrend flips or TIMEOUT.
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

    # Build a lookup dict {1H_timestamp_ms: (st_value, st_dir)} from 1H SuperTrend
    st_lookup: dict[int, tuple[float, int]] = {}
    if df_1h is not None:
        h = _compute_supertrend(df_1h)
        for _, r in h.iterrows():
            if not pd.isna(r["st_value"]) and not pd.isna(r["st_dir"]):
                st_lookup[int(r["timestamp"])] = (float(r["st_value"]), int(r["st_dir"]))

    st_keys = sorted(st_lookup.keys())

    def _latest_st(ts: int):
        """Binary-search latest 1H SuperTrend value at or before ts."""
        lo, hi = 0, len(st_keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if st_keys[mid] <= ts:
                result = st_lookup[st_keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    is_long    = side == "long"
    current_sl = sl_price   # initial stop; will be updated dynamically

    for idx, row in candles_1m.iterrows():
        ts   = int(row["timestamp"])
        low  = row["low"]
        high = row["high"]

        # Update trailing stop from latest 1H SuperTrend
        st_info = _latest_st(ts)
        if st_info is not None:
            st_val, st_dir = st_info
            # Only update SL if trend direction still matches our position
            if (is_long and st_dir == 1) or (not is_long and st_dir == -1):
                current_sl = st_val
            else:
                # SuperTrend flipped against position → use flip as exit signal
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "ST_FLIP",
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
                return _phase2(candles_1m, idx, entry_price, tp1_target, side,
                               st_keys, st_lookup, is_long)
        else:
            if high >= current_sl:
                return {
                    "exit_time":   ts,
                    "exit_price":  current_sl,
                    "exit_reason": "SL",
                    "tp1_hit":     False,
                }
            if tp1_target > 0 and low <= tp1_target:
                return _phase2(candles_1m, idx, entry_price, tp1_target, side,
                               st_keys, st_lookup, is_long)

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
    st_keys: list,
    st_lookup: dict,
    is_long: bool,
) -> dict:
    """Phase 2: after TP1 hold remaining until SuperTrend flips or BE stop."""
    tp1_pos   = candles_1m.index.get_loc(tp1_idx)
    remaining = candles_1m.iloc[tp1_pos + 1:]
    tp1_row   = candles_1m.loc[tp1_idx]
    be_stop   = entry_price

    def _latest_st(ts: int):
        lo, hi = 0, len(st_keys) - 1
        result = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if st_keys[mid] <= ts:
                result = st_lookup[st_keys[mid]]
                lo = mid + 1
            else:
                hi = mid - 1
        return result

    for idx, row in remaining.iterrows():
        ts = int(row["timestamp"])

        # BE stop
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

        # SuperTrend flip
        st_info = _latest_st(ts)
        if st_info is not None:
            _, st_dir = st_info
            flipped = (is_long and st_dir == -1) or (not is_long and st_dir == 1)
            if flipped:
                return {
                    "exit_time":   ts,
                    "exit_price":  row["close"],
                    "exit_reason": "ST_FLIP",
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
