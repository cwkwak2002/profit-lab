import json
import uuid
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import DEFAULT_SEED, DEFAULT_LEVERAGE
from data.db import (
    get_db, get_candles, save_candles, save_backtest_run, save_coin_summary,
    save_trades, get_backtest_run, get_coin_summaries, get_trades_for_coin,
)
from data.fetcher import date_to_ms, get_exchange, fetch_ohlcv, get_stored_range
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


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/run", response_model=BacktestRunResponse)
def run_backtest(req: BacktestRequest):
    """Execute backtest for specified coins and date range (non-streaming)."""
    run_id = str(uuid.uuid4())[:8]
    created_at = datetime.utcnow().isoformat()
    since_ms = date_to_ms(req.start_date)
    until_ms = date_to_ms(req.end_date)

    params = {"seed": req.seed, "leverage": req.leverage}

    with get_db() as conn:
        save_backtest_run(conn, run_id, created_at, req.start_date, req.end_date, req.coins, params)

        for symbol in req.coins:
            candles_1m_raw = get_candles(conn, symbol, "1m", since_ms, until_ms)

            if not candles_1m_raw:
                save_coin_summary(conn, run_id, symbol, 0, 0, 0, 0, req.seed)
                continue

            df_1m = pd.DataFrame(candles_1m_raw)
            df_1m_indexed = df_1m.copy()
            df_1m_indexed["datetime"] = pd.to_datetime(df_1m_indexed["timestamp"], unit="ms", utc=True)
            df_1m_indexed = df_1m_indexed.set_index("datetime")
            df_1h = df_1m_indexed.resample("1h").agg({
                "timestamp": "first", "open": "first", "high": "max",
                "low": "min", "close": "last", "volume": "sum",
            }).dropna(subset=["timestamp"]).reset_index(drop=True)
            df_1h["timestamp"] = df_1h["timestamp"].astype(int)

            result = run_backtest_for_coin(df_1h, df_1m, symbol, req.seed, req.leverage)
            summary = result["summary"]
            save_coin_summary(conn, run_id, symbol,
                              summary["total_trades"], summary["win_rate"],
                              summary["cumulative_return"], summary["max_drawdown"],
                              summary["final_balance"])
            if result["trades"]:
                save_trades(conn, [{**t, "run_id": run_id} for t in result["trades"]])

    return BacktestRunResponse(run_id=run_id)


@router.post("/run-stream")
def run_backtest_stream(req: BacktestRequest):
    """Execute sync + backtest with SSE progress streaming."""

    def generate():
        total_coins = len(req.coins)
        since_ms = date_to_ms(req.start_date)
        until_ms = date_to_ms(req.end_date)
        exchange = get_exchange()

        # --- Phase 1: Data Sync ---
        yield _sse_event({"phase": "sync", "message": "데이터 동기화 시작", "progress": 0})

        sync_errors = {}
        for idx, symbol in enumerate(req.coins):
            pct = int((idx / total_coins) * 50)  # sync = 0~50%
            yield _sse_event({
                "phase": "sync",
                "message": f"[{idx+1}/{total_coins}] {symbol} 데이터 수집 중...",
                "progress": pct,
                "symbol": symbol,
            })

            try:
                with get_db() as conn:
                    stored_min, stored_max = get_stored_range(conn, symbol, "1m")
                    total = 0

                    if stored_min is None:
                        candles = fetch_ohlcv(exchange, symbol, "1m", since_ms, until_ms)
                        save_candles(conn, symbol, "1m", candles)
                        total = len(candles)
                    else:
                        if since_ms < stored_min:
                            candles = fetch_ohlcv(exchange, symbol, "1m", since_ms, stored_min - 1)
                            save_candles(conn, symbol, "1m", candles)
                            total += len(candles)
                        if until_ms > stored_max:
                            candles = fetch_ohlcv(exchange, symbol, "1m", stored_max + 1, until_ms)
                            save_candles(conn, symbol, "1m", candles)
                            total += len(candles)

                yield _sse_event({
                    "phase": "sync",
                    "message": f"[{idx+1}/{total_coins}] {symbol} 동기화 완료 ({total:,}건)",
                    "progress": int(((idx + 1) / total_coins) * 50),
                    "symbol": symbol,
                })
            except Exception as e:
                sync_errors[symbol] = str(e)
                yield _sse_event({
                    "phase": "sync",
                    "message": f"[{idx+1}/{total_coins}] {symbol} 에러: {e}",
                    "progress": int(((idx + 1) / total_coins) * 50),
                    "symbol": symbol,
                    "error": True,
                })

        yield _sse_event({"phase": "sync", "message": "데이터 동기화 완료", "progress": 50})

        # --- Phase 2: Backtest ---
        run_id = str(uuid.uuid4())[:8]
        created_at = datetime.utcnow().isoformat()
        params = {"seed": req.seed, "leverage": req.leverage}

        yield _sse_event({"phase": "backtest", "message": "백테스트 시작", "progress": 50})

        with get_db() as conn:
            save_backtest_run(conn, run_id, created_at, req.start_date, req.end_date, req.coins, params)

            for idx, symbol in enumerate(req.coins):
                pct = 50 + int((idx / total_coins) * 50)  # backtest = 50~100%
                yield _sse_event({
                    "phase": "backtest",
                    "message": f"[{idx+1}/{total_coins}] {symbol} 백테스트 중...",
                    "progress": pct,
                    "symbol": symbol,
                })

                candles_1m_raw = get_candles(conn, symbol, "1m", since_ms, until_ms)

                if not candles_1m_raw:
                    save_coin_summary(conn, run_id, symbol, 0, 0, 0, 0, req.seed)
                    yield _sse_event({
                        "phase": "backtest",
                        "message": f"[{idx+1}/{total_coins}] {symbol} — 데이터 없음",
                        "progress": 50 + int(((idx + 1) / total_coins) * 50),
                        "symbol": symbol,
                    })
                    continue

                df_1m = pd.DataFrame(candles_1m_raw)
                df_1m_indexed = df_1m.copy()
                df_1m_indexed["datetime"] = pd.to_datetime(df_1m_indexed["timestamp"], unit="ms", utc=True)
                df_1m_indexed = df_1m_indexed.set_index("datetime")
                df_1h = df_1m_indexed.resample("1h").agg({
                    "timestamp": "first", "open": "first", "high": "max",
                    "low": "min", "close": "last", "volume": "sum",
                }).dropna(subset=["timestamp"]).reset_index(drop=True)
                df_1h["timestamp"] = df_1h["timestamp"].astype(int)

                result = run_backtest_for_coin(df_1h, df_1m, symbol, req.seed, req.leverage)
                summary = result["summary"]
                save_coin_summary(conn, run_id, symbol,
                                  summary["total_trades"], summary["win_rate"],
                                  summary["cumulative_return"], summary["max_drawdown"],
                                  summary["final_balance"])
                if result["trades"]:
                    save_trades(conn, [{**t, "run_id": run_id} for t in result["trades"]])

                yield _sse_event({
                    "phase": "backtest",
                    "message": f"[{idx+1}/{total_coins}] {symbol} 완료 — {summary['total_trades']}건, {summary['cumulative_return']:+.1f}%",
                    "progress": 50 + int(((idx + 1) / total_coins) * 50),
                    "symbol": symbol,
                })

        yield _sse_event({
            "phase": "done",
            "message": "백테스트 완료!",
            "progress": 100,
            "run_id": run_id,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
