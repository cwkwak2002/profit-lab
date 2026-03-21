import pandas as pd
import numpy as np
from datetime import datetime

from config import (
    DEFAULT_SEED, DEFAULT_LEVERAGE, TAKER_FEE, SLIPPAGE,
    TP1_CLOSE_RATIO, TP1_PROFIT_PCT, TP2_PROFIT_PCT,
)
from strategy.rsi_divergence import find_entry_signals, simulate_exit_on_1m


def run_backtest_for_coin(
    df_1h: pd.DataFrame,
    df_1m: pd.DataFrame,
    symbol: str,
    seed: float = DEFAULT_SEED,
    leverage: int = DEFAULT_LEVERAGE,
) -> dict:
    """Run backtest for a single coin (long only)."""
    signals = find_entry_signals(df_1h)

    if not signals:
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

    balance = seed
    trades = []
    peak_balance = seed
    max_drawdown = 0.0
    last_exit_time = 0

    for signal in signals:
        entry_time = signal["entry_time"]

        if entry_time <= last_exit_time:
            continue

        entry_price_raw = signal["entry_price"]
        sl_price = signal["sl_price"]

        # Slippage on entry (worse for long = higher price)
        entry_price = entry_price_raw * (1 + SLIPPAGE)

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

        exit_result = simulate_exit_on_1m(position_1m, entry_price, sl_price, entry_time)
        exit_reason = exit_result["exit_reason"]

        # Calculate P&L
        if exit_result.get("tp1_hit", False) and exit_reason in ("TP2", "BE", "TIMEOUT"):
            tp1_price_raw = exit_result["tp1_price"]
            tp1_price = tp1_price_raw * (1 - SLIPPAGE)

            qty_phase1 = position_qty * TP1_CLOSE_RATIO
            pnl_phase1 = qty_phase1 * (tp1_price - entry_price)
            fee_phase1 = qty_phase1 * tp1_price * TAKER_FEE

            qty_phase2 = position_qty * (1 - TP1_CLOSE_RATIO)
            exit_price_raw = exit_result["exit_price"]

            if exit_reason == "BE":
                exit_price = entry_price
            else:
                exit_price = exit_price_raw * (1 - SLIPPAGE)

            pnl_phase2 = qty_phase2 * (exit_price - entry_price)
            fee_phase2 = qty_phase2 * exit_price * TAKER_FEE

            total_pnl = pnl_phase1 + pnl_phase2 - entry_fee - fee_phase1 - fee_phase2
            final_exit_price = exit_price
        else:
            exit_price_raw = exit_result["exit_price"]
            if exit_reason == "SL":
                exit_price = exit_price_raw * (1 + SLIPPAGE)
            else:
                exit_price = exit_price_raw * (1 - SLIPPAGE)

            exit_fee = position_size_usd * TAKER_FEE
            total_pnl = position_qty * (exit_price - entry_price) - entry_fee - exit_fee
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
            "side": "long",
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

    wins = sum(1 for t in trades if t["pnl"] > 0)
    total = len(trades)
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


def _ms_to_iso(ms: int) -> str:
    """Convert millisecond timestamp to ISO format string."""
    return datetime.utcfromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M:%S")
