import pandas as pd
import pandas_ta as ta
import numpy as np

from config import (
    SQZ_BB_PERIOD, SQZ_BB_STD, SQZ_WIDTH_LOOKBACK, SQZ_WIDTH_PERCENTILE,
    SQZ_MIN_SQUEEZE_BARS, SQZ_VOLUME_MULT_LONG, SQZ_VOLUME_MULT_SHORT,
    SQZ_VOLUME_AVG_PERIOD, SQZ_SHORT_TP_PCT,
)
from strategy.risk_filters import check_bb_expansion_filter


def find_entry_signals(df_15m: pd.DataFrame) -> list[dict]:
    """Find BB Squeeze Breakout entry signals on 15m candles.

    Squeeze: BB Width in bottom 20% of last 100 bars, lasting >= 15 bars.
    Long: close > upper band + volume >= 200% avg + lower band slope negative.
    Short: close < lower band + volume >= 250% avg.
    """
    df = df_15m.copy()

    # Bollinger Bands
    bb = ta.bbands(df["close"], length=SQZ_BB_PERIOD, std=SQZ_BB_STD)
    if bb is None:
        return []

    df["bb_lower"] = bb.iloc[:, 0]
    df["bb_mid"] = bb.iloc[:, 1]
    df["bb_upper"] = bb.iloc[:, 2]
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["bb_mid"]

    # Volume average
    df["vol_avg"] = df["volume"].rolling(window=SQZ_VOLUME_AVG_PERIOD).mean()

    signals = []

    for i in range(SQZ_WIDTH_LOOKBACK + 1, len(df) - 1):
        row = df.iloc[i]

        if pd.isna(row["bb_width"]) or pd.isna(row["vol_avg"]) or row["vol_avg"] == 0:
            continue

        # BB width percentile threshold from lookback window
        width_window = df["bb_width"].iloc[i - SQZ_WIDTH_LOOKBACK:i]
        threshold = np.nanpercentile(width_window.values, SQZ_WIDTH_PERCENTILE)

        # Count consecutive squeeze bars ending at i-1
        squeeze_count = 0
        for j in range(i - 1, max(i - SQZ_WIDTH_LOOKBACK - 1, -1), -1):
            if df.iloc[j]["bb_width"] <= threshold:
                squeeze_count += 1
            else:
                break

        if squeeze_count < SQZ_MIN_SQUEEZE_BARS:
            continue

        # Current bar must NOT be in squeeze (it's the breakout)
        if row["bb_width"] <= threshold:
            continue

        next_candle = df.iloc[i + 1]
        entry_price = next_candle["open"]

        # Long breakout: close > upper band
        if row["close"] > row["bb_upper"]:
            # Volume >= 200%
            if row["volume"] < row["vol_avg"] * SQZ_VOLUME_MULT_LONG:
                continue

            # Filter 4: BB expansion — lower band slope must be negative
            if check_bb_expansion_filter(df, i, "long"):
                continue

            sl_price = row["bb_mid"]
            if sl_price >= entry_price:
                continue
            signals.append({
                "side": "long",
                "signal_idx": i,
                "signal_time": int(row["timestamp"]),
                "entry_time": int(next_candle["timestamp"]),
                "entry_price": entry_price,
                "sl_price": sl_price,
                "bb_upper": row["bb_upper"],
                "bb_mid": row["bb_mid"],
                "signal_candle_low": row["low"],
            })

        # Short breakout: close < lower band
        elif row["close"] < row["bb_lower"]:
            # Volume >= 250%
            if row["volume"] < row["vol_avg"] * SQZ_VOLUME_MULT_SHORT:
                continue

            sl_price = row["bb_mid"]
            if sl_price <= entry_price:
                continue
            signals.append({
                "side": "short",
                "signal_idx": i,
                "signal_time": int(row["timestamp"]),
                "entry_time": int(next_candle["timestamp"]),
                "entry_price": entry_price,
                "sl_price": sl_price,
                "bb_lower": row["bb_lower"],
                "bb_mid": row["bb_mid"],
                "signal_candle_low": row["low"],
            })

    return signals


def simulate_exit_on_1m(df_1m: pd.DataFrame, entry_price: float, sl_price: float,
                        entry_time_ms: int, side: str = "long") -> dict:
    """Simulate exit for BB Squeeze Breakout strategy.

    Long: SL at midline. Trailing stop when price re-enters band (peak -1% or midline).
    Short: SL at midline. Fixed TP at +3.5%.
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

    if side == "short":
        return _simulate_short_exit(candles_1m, entry_price, sl_price)

    return _simulate_long_exit(candles_1m, entry_price, sl_price)


def _simulate_long_exit(candles_1m: pd.DataFrame, entry_price: float,
                        sl_price: float) -> dict:
    """Long exit: SL at midline, trailing stop on band re-entry."""
    # Compute BB on 1m for trailing stop
    bb_1m = ta.bbands(candles_1m["close"], length=SQZ_BB_PERIOD, std=SQZ_BB_STD)
    bb_upper_1m = bb_1m.iloc[:, 2] if bb_1m is not None else pd.Series(dtype=float)
    bb_mid_1m = bb_1m.iloc[:, 1] if bb_1m is not None else pd.Series(dtype=float)

    trailing_active = False
    trailing_stop = 0.0
    best_price = entry_price

    for idx, row in candles_1m.iterrows():
        low = row["low"]
        high = row["high"]
        close = row["close"]
        ts = int(row["timestamp"])
        mid = bb_mid_1m.get(idx, np.nan)

        # SL: touch midline (only before trailing activates)
        if not pd.isna(mid) and low <= mid and not trailing_active:
            return {
                "exit_time": ts,
                "exit_price": mid,
                "exit_reason": "SL",
                "tp1_hit": False,
            }

        if high > best_price:
            best_price = high

        upper = bb_upper_1m.get(idx, np.nan)
        if not pd.isna(upper) and best_price > entry_price:
            if close < upper and not trailing_active:
                trailing_active = True
                trailing_stop = entry_price

            if trailing_active:
                new_trail = best_price * 0.99  # peak -1%
                if not pd.isna(mid) and mid > new_trail:
                    new_trail = mid
                if new_trail > trailing_stop:
                    trailing_stop = new_trail

                if low <= trailing_stop:
                    return {
                        "exit_time": ts,
                        "exit_price": trailing_stop,
                        "exit_reason": "TRAIL",
                        "tp1_hit": True,
                        "tp1_time": ts,
                        "tp1_price": trailing_stop,
                    }

    last = candles_1m.iloc[-1]
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": False,
    }


def _simulate_short_exit(candles_1m: pd.DataFrame, entry_price: float,
                         sl_price: float) -> dict:
    """Short exit: SL at midline. Fixed TP at +3.5%."""
    bb_1m = ta.bbands(candles_1m["close"], length=SQZ_BB_PERIOD, std=SQZ_BB_STD)
    bb_mid_1m = bb_1m.iloc[:, 1] if bb_1m is not None else pd.Series(dtype=float)

    tp_price = entry_price * (1 - SQZ_SHORT_TP_PCT)  # target is below entry

    for idx, row in candles_1m.iterrows():
        high = row["high"]
        low = row["low"]
        ts = int(row["timestamp"])
        mid = bb_mid_1m.get(idx, np.nan)

        # SL: touch midline (price rises to midline)
        if not pd.isna(mid) and high >= mid:
            return {
                "exit_time": ts,
                "exit_price": mid,
                "exit_reason": "SL",
                "tp1_hit": False,
            }

        # Fixed TP: price falls to target
        if low <= tp_price:
            return {
                "exit_time": ts,
                "exit_price": tp_price,
                "exit_reason": "FIXED_TP",
                "tp1_hit": False,
            }

    last = candles_1m.iloc[-1]
    return {
        "exit_time": int(last["timestamp"]),
        "exit_price": last["close"],
        "exit_reason": "TIMEOUT",
        "tp1_hit": False,
    }
