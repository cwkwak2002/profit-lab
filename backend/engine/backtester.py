import pandas as pd
import numpy as np
from datetime import datetime

from config import (
    DEFAULT_SEED, DEFAULT_LEVERAGE, TAKER_FEE, SLIPPAGE,
    TP1_CLOSE_RATIO,
    EMA_TP1_CLOSE_RATIO,
    ST_TP1_CLOSE_RATIO,
    UTBOT_TP1_CLOSE_RATIO,
)
from strategy.rsi_divergence import (
    find_entry_signals as rsi_find_entries,
    simulate_exit_on_1m as rsi_simulate_exit,
    prepare_rsi_risk_context, should_block_rsi_signal,
)
from strategy.ema_trend import (
    find_entry_signals as ema_find_entries,
    simulate_exit_on_1m as ema_simulate_exit,
)
from strategy.bb_squeeze import (
    find_entry_signals as sqz_find_entries,
    simulate_exit_on_1m as sqz_simulate_exit,
)
from strategy.supertrend import (
    find_entry_signals as st_find_entries,
    simulate_exit_on_1m as st_simulate_exit,
)
from strategy.utbot import (
    find_entry_signals as utbot_find_entries,
    simulate_exit_on_1m as utbot_simulate_exit,
)
from strategy.risk_filters import prepare_risk_context, should_block_signal


def run_backtest_for_coin(
    df_1h: pd.DataFrame,
    df_1m: pd.DataFrame,
    symbol: str,
    seed: float = DEFAULT_SEED,
    leverage: int = DEFAULT_LEVERAGE,
    strategy: str = "rsi_divergence",
    df_15m: pd.DataFrame | None = None,
    btc_df_1h: pd.DataFrame | None = None,
) -> dict:
    """Run backtest for a single coin."""

    # --- Strategy dispatch: find entry signals ---
    if strategy == "ema_trend":
        if df_15m is None:
            return _empty_result(symbol, seed)
        signals = ema_find_entries(df_1h, df_15m)
        tp1_close_ratio = EMA_TP1_CLOSE_RATIO
    elif strategy == "bb_squeeze":
        if df_15m is None:
            return _empty_result(symbol, seed)
        signals = sqz_find_entries(df_15m)
        tp1_close_ratio = TP1_CLOSE_RATIO
    elif strategy == "supertrend":
        signals = st_find_entries(df_1h)
        tp1_close_ratio = ST_TP1_CLOSE_RATIO
    elif strategy == "utbot":
        signals = utbot_find_entries(df_1h)
        tp1_close_ratio = UTBOT_TP1_CLOSE_RATIO
    else:
        signals = rsi_find_entries(df_1h)
        tp1_close_ratio = TP1_CLOSE_RATIO

    if not signals:
        return _empty_result(symbol, seed)

    # --- Risk filters ---
    blocked_records = []

    def _apply_risk_filter(signals_list, block_fn, ctx):
        filtered = []
        for s in signals_list:
            blocked, reason = block_fn(s, ctx)
            if blocked:
                blocked_records.append({
                    "_sort_time": s["entry_time"],
                    "symbol": symbol,
                    "side": s.get("side", "long"),
                    "entry_time": _ms_to_iso(s["entry_time"]),
                    "entry_price": round(s["entry_price"], 6),
                    "entry_margin": 0.0,
                    "exit_time": _ms_to_iso(s["entry_time"]),
                    "exit_price": round(s["entry_price"], 6),
                    "exit_reason": reason,
                    "pnl": 0.0,
                    "pnl_pct": 0.0,
                    "balance_after": 0.0,
                    "tp1_time": None,
                })
            else:
                filtered.append(s)
        return filtered

    if strategy == "rsi_divergence":
        rsi_risk_ctx = prepare_rsi_risk_context(
            df_1h=df_1h, df_1m=df_1m,
            btc_df_1h=btc_df_1h, symbol=symbol,
        )
        signals = _apply_risk_filter(signals, should_block_rsi_signal, rsi_risk_ctx)
    elif strategy in ("supertrend", "utbot"):
        # These strategies use their own dynamic trailing stop; skip shared risk filters
        pass
    else:
        risk_ctx = prepare_risk_context(
            df_1h=df_1h, df_15m=df_15m, df_1m=df_1m,
            btc_df_1h=btc_df_1h, symbol=symbol,
        )
        signals = _apply_risk_filter(signals, should_block_signal, risk_ctx)

    if not signals and not blocked_records:
        return _empty_result(symbol, seed)

    balance = seed
    trades = []
    peak_balance = seed
    max_drawdown = 0.0
    last_exit_time = 0

    # Merge blocked records into timeline for correct ordering
    all_events: list[tuple[str, dict]] = []
    for s in signals:
        all_events.append(("signal", s))
    for br in blocked_records:
        all_events.append(("blocked", br))
    all_events.sort(key=lambda x: x[1]["entry_time"] if x[0] == "signal" else x[1]["_sort_time"])

    for event_type, event in all_events:
        if event_type == "blocked":
            br = {k: v for k, v in event.items() if k != "_sort_time"}
            br["balance_after"] = round(balance, 2)
            trades.append(br)
            continue

        signal = event
        entry_time = signal["entry_time"]

        if entry_time <= last_exit_time:
            continue

        entry_price_raw = signal["entry_price"]
        sl_price = signal["sl_price"]
        side = signal.get("side", "long")

        # Slippage on entry
        entry_price = entry_price_raw * (1 + SLIPPAGE if side == "long" else 1 - SLIPPAGE)

        margin = balance
        position_size_usd = margin * leverage
        position_qty = position_size_usd / entry_price

        entry_fee = position_size_usd * TAKER_FEE

        # 1m window for exit simulation (72h)
        window_end = entry_time + (72 * 60 * 60 * 1000)
        mask_1m = (df_1m["timestamp"] >= entry_time) & (df_1m["timestamp"] <= window_end)
        position_1m = df_1m.loc[mask_1m].copy()

        if position_1m.empty:
            continue

        # --- Strategy dispatch: simulate exit ---
        if strategy == "ema_trend":
            exit_result = ema_simulate_exit(
                position_1m, entry_price, sl_price, entry_time,
                tp1_target=signal.get("tp1_target", 0.0),
                df_15m=df_15m, side=side,
            )
        elif strategy == "bb_squeeze":
            exit_result = sqz_simulate_exit(
                position_1m, entry_price, sl_price, entry_time, side=side,
            )
        elif strategy == "supertrend":
            exit_result = st_simulate_exit(
                position_1m, entry_price, sl_price, entry_time,
                tp1_target=signal.get("tp1_target", 0.0),
                df_1h=df_1h, side=side,
            )
        elif strategy == "utbot":
            exit_result = utbot_simulate_exit(
                position_1m, entry_price, sl_price, entry_time,
                tp1_target=signal.get("tp1_target", 0.0),
                df_1h=df_1h, side=side,
            )
        else:
            exit_result = rsi_simulate_exit(
                position_1m, entry_price, sl_price, entry_time,
                tp1_target=signal.get("tp1_target", 0.0),
                df_15m=df_15m,
            )

        exit_reason = exit_result["exit_reason"]

        # Calculate P&L (direction-aware)
        is_long = side == "long"

        if exit_result.get("tp1_hit", False) and exit_reason in ("TP2", "BE", "TIMEOUT", "EMA_CROSS", "TRAIL", "ST_FLIP", "UT_FLIP"):
            tp1_price_raw = exit_result["tp1_price"]
            tp1_price = tp1_price_raw * (1 - SLIPPAGE if is_long else 1 + SLIPPAGE)

            qty_phase1 = position_qty * tp1_close_ratio
            pnl_phase1 = qty_phase1 * (tp1_price - entry_price) * (1 if is_long else -1)
            fee_phase1 = qty_phase1 * tp1_price * TAKER_FEE

            qty_phase2 = position_qty * (1 - tp1_close_ratio)
            exit_price_raw = exit_result["exit_price"]

            if exit_reason == "BE":
                exit_price = entry_price
            else:
                exit_price = exit_price_raw * (1 - SLIPPAGE if is_long else 1 + SLIPPAGE)

            pnl_phase2 = qty_phase2 * (exit_price - entry_price) * (1 if is_long else -1)
            fee_phase2 = qty_phase2 * exit_price * TAKER_FEE

            total_pnl = pnl_phase1 + pnl_phase2 - entry_fee - fee_phase1 - fee_phase2
            final_exit_price = exit_price
        else:
            exit_price_raw = exit_result["exit_price"]
            if exit_reason == "SL":
                exit_price = exit_price_raw * (1 + SLIPPAGE if is_long else 1 - SLIPPAGE)
            else:
                exit_price = exit_price_raw * (1 - SLIPPAGE if is_long else 1 + SLIPPAGE)

            exit_fee = position_size_usd * TAKER_FEE
            total_pnl = position_qty * (exit_price - entry_price) * (1 if is_long else -1) - entry_fee - exit_fee
            final_exit_price = exit_price

        balance += total_pnl
        if balance <= 0:
            balance = 0

        if balance > peak_balance:
            peak_balance = balance
        drawdown = (peak_balance - balance) / peak_balance if peak_balance > 0 else 0
        if drawdown > max_drawdown:
            max_drawdown = drawdown

        pnl_pct = (total_pnl / margin) * 100 if margin > 0 else 0

        trade_record = {
            "symbol": symbol,
            "side": side,
            "entry_time": _ms_to_iso(entry_time),
            "entry_price": round(entry_price, 6),
            "entry_margin": round(margin, 2),
            "exit_time": _ms_to_iso(exit_result["exit_time"]),
            "exit_price": round(final_exit_price, 6),
            "exit_reason": exit_reason,
            "pnl": round(total_pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "balance_after": round(balance, 2),
            "tp1_time": _ms_to_iso(exit_result["tp1_time"]) if exit_result.get("tp1_time") else None,
        }
        trades.append(trade_record)

        last_exit_time = exit_result["exit_time"]

        if balance <= 0:
            break

    # Summary excludes blocked records
    real_trades = [t for t in trades if not t["exit_reason"].startswith("RISK_")]
    wins = sum(1 for t in real_trades if t["pnl"] > 0)
    total = len(real_trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    cumulative_return = ((balance - seed) / seed * 100) if seed > 0 else 0

    summary = {
        "symbol": symbol,
        "total_trades": total,
        "win_rate": round(win_rate, 2),
        "cumulative_return": round(cumulative_return, 2),
        "max_drawdown": round(max_drawdown * 100, 2),
        "final_balance": round(balance, 2),
    }

    return {"trades": trades, "summary": summary}


def _empty_result(symbol: str, seed: float) -> dict:
    return {
        "trades": [],
        "summary": {
            "symbol": symbol,
            "total_trades": 0,
            "win_rate": 0.0,
            "cumulative_return": 0.0,
            "max_drawdown": 0.0,
            "final_balance": seed,
        },
    }


def _ms_to_iso(ms: int) -> str:
    """Convert millisecond timestamp to ISO format string."""
    return datetime.utcfromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M:%S")
