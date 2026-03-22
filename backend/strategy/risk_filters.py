"""Risk Avoidance Filters — applied to strategies B and C before entry.

Filters:
1. EMA gap < 0.5% → no entry
2. 15m candle trapped between 50/200 EMA → no entry
3. 1H ADX(14) < 20 → no entry
4. BB upper breakout: lower band slope must be negative (bb_squeeze only)
5. 5-min 3%+ move → 60 min cooldown per symbol
6. BTC 1H -5%+ → no altcoin longs
"""

import pandas as pd
import pandas_ta as ta
import numpy as np
from bisect import bisect_right

from config import (
    EMA_FAST, EMA_SLOW, ADX_PERIOD,
    RISK_EMA_GAP_MIN_PCT, RISK_ADX_MIN,
    RISK_SPIKE_PCT, RISK_SPIKE_COOLDOWN_MS,
    RISK_BTC_CRASH_PCT,
    BB_PERIOD, BB_STD,
)

# Human-readable labels for risk filter reasons
RISK_REASON_LABELS = {
    "RISK_EMA_GAP": "EMA 간격 < 0.5%",
    "RISK_TRAPPED": "15m EMA 구간 갇힘",
    "RISK_ADX": "ADX < 20",
    "RISK_BB_EXPANSION": "BB 확장 필터",
    "RISK_SPIKE": "급등/급락 쿨다운",
    "RISK_BTC_CRASH": "BTC 급락",
}


def prepare_risk_context(
    df_1h: pd.DataFrame,
    df_15m: pd.DataFrame | None = None,
    df_1m: pd.DataFrame | None = None,
    btc_df_1h: pd.DataFrame | None = None,
    symbol: str = "",
) -> dict:
    """Pre-compute indicators needed by risk filters.

    Returns a context dict consumed by `should_block_signal()`.
    """
    ctx: dict = {}

    # --- 1H EMA + ADX ---
    h = df_1h.copy()
    h["ema_fast"] = ta.ema(h["close"], length=EMA_FAST)
    h["ema_slow"] = ta.ema(h["close"], length=EMA_SLOW)
    adx_df = ta.adx(h["high"], h["low"], h["close"], length=ADX_PERIOD)
    h["adx"] = adx_df.iloc[:, 0] if adx_df is not None else np.nan
    ctx["h"] = h

    # --- 15m EMA (for trap filter) ---
    if df_15m is not None:
        m15 = df_15m.copy()
        m15["ema50"] = ta.ema(m15["close"], length=EMA_FAST)
        m15["ema200"] = ta.ema(m15["close"], length=EMA_SLOW)
        ctx["m15"] = m15
    else:
        ctx["m15"] = None

    # --- 1m spike detection (pre-compute 5-bar pct changes) ---
    if df_1m is not None:
        m1 = df_1m.copy()
        m1["pct_5"] = m1["close"].pct_change(5).abs()
        spike_mask = m1["pct_5"] >= RISK_SPIKE_PCT
        ctx["spike_times"] = sorted(m1.loc[spike_mask, "timestamp"].tolist())
    else:
        ctx["spike_times"] = []

    # --- BTC 1H returns (for altcoin long block) ---
    if btc_df_1h is not None:
        b = btc_df_1h.copy()
        b["ret_1h"] = b["close"].pct_change()
        ctx["btc_1h"] = b
    else:
        ctx["btc_1h"] = None

    ctx["symbol"] = symbol
    return ctx


def should_block_signal(signal: dict, ctx: dict) -> tuple[bool, str]:
    """Return (blocked, reason_code). reason_code is empty string if not blocked."""
    entry_ts = signal["entry_time"]  # milliseconds
    side = signal.get("side", "long")

    # --- Filter 1: EMA gap < 0.5% on 1H ---
    h = ctx["h"]
    h_before = h[h["timestamp"] <= entry_ts]
    if not h_before.empty:
        hr = h_before.iloc[-1]
        if not pd.isna(hr.get("ema_fast")) and not pd.isna(hr.get("ema_slow")):
            gap = abs(hr["ema_fast"] - hr["ema_slow"]) / hr["ema_slow"]
            if gap < RISK_EMA_GAP_MIN_PCT:
                return True, "RISK_EMA_GAP"

    # --- Filter 2: 15m candle trapped between 50/200 EMA ---
    m15 = ctx.get("m15")
    if m15 is not None and not m15.empty:
        m15_before = m15[m15["timestamp"] <= entry_ts]
        if not m15_before.empty:
            mr = m15_before.iloc[-1]
            e50 = mr.get("ema50")
            e200 = mr.get("ema200")
            if not pd.isna(e50) and not pd.isna(e200):
                upper = max(e50, e200)
                lower = min(e50, e200)
                if lower <= mr["close"] <= upper:
                    return True, "RISK_TRAPPED"

    # --- Filter 3: 1H ADX < 20 ---
    if not h_before.empty:
        hr = h_before.iloc[-1]
        if not pd.isna(hr.get("adx")) and hr["adx"] < RISK_ADX_MIN:
            return True, "RISK_ADX"

    # --- Filter 5: 5-min 3%+ spike → 60 min cooldown ---
    spike_times = ctx.get("spike_times", [])
    if spike_times:
        cooldown_start = entry_ts - RISK_SPIKE_COOLDOWN_MS
        idx = bisect_right(spike_times, entry_ts) - 1
        if idx >= 0 and spike_times[idx] >= cooldown_start:
            return True, "RISK_SPIKE"

    # --- Filter 6: BTC 1H -5%+ → no altcoin longs ---
    btc_1h = ctx.get("btc_1h")
    symbol = ctx.get("symbol", "")
    if btc_1h is not None and symbol != "BTC" and side == "long":
        btc_before = btc_1h[btc_1h["timestamp"] <= entry_ts]
        if not btc_before.empty:
            btc_ret = btc_before.iloc[-1].get("ret_1h")
            if not pd.isna(btc_ret) and btc_ret <= RISK_BTC_CRASH_PCT:
                return True, "RISK_BTC_CRASH"

    return False, ""


def check_bb_expansion_filter(df: pd.DataFrame, idx: int, side: str) -> bool:
    """Filter 4: BB upper breakout requires lower band slope to be negative.

    Returns True if the signal should be BLOCKED.
    Only applies to long BB breakout signals.
    """
    if side != "long":
        return False

    if idx < 2:
        return False

    bb = df.get("bb_lower")
    if bb is None:
        return False

    curr_lower = bb.iloc[idx]
    prev_lower = bb.iloc[idx - 1]

    if pd.isna(curr_lower) or pd.isna(prev_lower):
        return False

    # Lower band slope must be negative (falling) for valid upper breakout
    slope = curr_lower - prev_lower
    if slope >= 0:
        return True

    return False
