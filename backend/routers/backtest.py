import uuid
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import DEFAULT_SEED, DEFAULT_LEVERAGE
from data.db import (
    get_db, get_candles, save_backtest_run, save_coin_summary,
    save_trades, get_backtest_run, get_coin_summaries, get_trades_for_coin,
)
from data.fetcher import date_to_ms
from engine.backtester import run_backtest_for_coin

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    coins: list[str]
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    seed: float = DEFAULT_SEED
    leverage: int = DEFAULT_LEVERAGE


class BacktestRunResponse(BaseModel):
    run_id: str


@router.post("/run", response_model=BacktestRunResponse)
def run_backtest(req: BacktestRequest):
    """Execute backtest for specified coins and date range."""
    run_id = str(uuid.uuid4())[:8]
    created_at = datetime.utcnow().isoformat()
    since_ms = date_to_ms(req.start_date)
    until_ms = date_to_ms(req.end_date)

    params = {"seed": req.seed, "leverage": req.leverage}

    with get_db() as conn:
        save_backtest_run(conn, run_id, created_at, req.start_date, req.end_date, req.coins, params)

        for symbol in req.coins:
            # Load candles from DB
            candles_1h_raw = get_candles(conn, symbol, "1h", since_ms, until_ms)
            candles_1m_raw = get_candles(conn, symbol, "1m", since_ms, until_ms)

            if not candles_1h_raw or not candles_1m_raw:
                # Save empty summary
                save_coin_summary(conn, run_id, symbol, 0, 0, 0, 0, req.seed)
                continue

            df_1h = pd.DataFrame(candles_1h_raw)
            df_1m = pd.DataFrame(candles_1m_raw)

            result = run_backtest_for_coin(df_1h, df_1m, symbol, req.seed, req.leverage)

            summary = result["summary"]
            save_coin_summary(
                conn, run_id, symbol,
                summary["total_trades"], summary["win_rate"],
                summary["cumulative_return"], summary["max_drawdown"],
                summary["final_balance"],
            )

            if result["trades"]:
                trade_records = [{**t, "run_id": run_id} for t in result["trades"]]
                save_trades(conn, trade_records)

    return BacktestRunResponse(run_id=run_id)


@router.get("/{run_id}/summary")
def get_summary(run_id: str):
    """Get overall backtest summary."""
    with get_db() as conn:
        run = get_backtest_run(conn, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backtest run not found")

        summaries = get_coin_summaries(conn, run_id)

        # Aggregate
        total_trades = sum(s["total_trades"] for s in summaries)
        avg_win_rate = (
            sum(s["win_rate"] * s["total_trades"] for s in summaries) / total_trades
            if total_trades > 0 else 0
        )
        avg_return = (
            sum(s["cumulative_return"] for s in summaries) / len(summaries)
            if summaries else 0
        )
        avg_mdd = (
            sum(s["max_drawdown"] for s in summaries) / len(summaries)
            if summaries else 0
        )

    return {
        "run": run,
        "aggregate": {
            "total_trades": total_trades,
            "avg_win_rate": round(avg_win_rate, 2),
            "avg_return": round(avg_return, 2),
            "avg_mdd": round(avg_mdd, 2),
        },
    }


@router.get("/{run_id}/coins")
def get_coins(run_id: str):
    """Get per-coin summary list."""
    with get_db() as conn:
        run = get_backtest_run(conn, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backtest run not found")
        summaries = get_coin_summaries(conn, run_id)
    return {"coins": summaries}


@router.get("/{run_id}/coins/{symbol}/trades")
def get_coin_trades(run_id: str, symbol: str):
    """Get detailed trade log for a specific coin."""
    with get_db() as conn:
        run = get_backtest_run(conn, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Backtest run not found")
        trades = get_trades_for_coin(conn, run_id, symbol)
    return {"trades": trades}
