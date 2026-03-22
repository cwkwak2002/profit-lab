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


VALID_STRATEGIES = {"rsi_divergence", "ema_trend", "bb_squeeze"}


class BacktestRequest(BaseModel):
    coins: list[str]
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    seed: float = DEFAULT_SEED
    leverage: int = DEFAULT_LEVERAGE
    strategy: str = "rsi_divergence"


class BacktestRunResponse(BaseModel):
    run_id: str


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _resample(df_1m_indexed: pd.DataFrame, freq: str) -> pd.DataFrame:
    """Resample 1m indexed DataFrame to a higher timeframe."""
    df = df_1m_indexed.resample(freq).agg({
        "timestamp": "first", "open": "first", "high": "max",
        "low": "min", "close": "last", "volume": "sum",
    }).dropna(subset=["timestamp"]).reset_index(drop=True)
    df["timestamp"] = df["timestamp"].astype(int)
    return df


def _prepare_dfs(df_1m: pd.DataFrame, strategy: str):
    """Prepare resampled DataFrames needed by the strategy."""
    df_1m_indexed = df_1m.copy()
    df_1m_indexed["datetime"] = pd.to_datetime(df_1m_indexed["timestamp"], unit="ms", utc=True)
    df_1m_indexed = df_1m_indexed.set_index("datetime")

    df_1h = _resample(df_1m_indexed, "1h")
    # All strategies use 15m data (RSI for TP2, EMA/BB for entry+exit)
    df_15m = _resample(df_1m_indexed, "15min")

    return df_1h, df_15m


def _ensure_btc_synced(conn, exchange, since_ms: int, until_ms: int):
    """Ensure BTC 1m data is synced for the given date range (needed by risk filters)."""
    stored_min, stored_max = get_stored_range(conn, "BTC", "1m")
    if stored_min is None:
        candles = fetch_ohlcv(exchange, "BTC", "1m", since_ms, until_ms)
        save_candles(conn, "BTC", "1m", candles)
    else:
        if since_ms < stored_min:
            candles = fetch_ohlcv(exchange, "BTC", "1m", since_ms, stored_min - 1)
            save_candles(conn, "BTC", "1m", candles)
        if until_ms > stored_max:
            candles = fetch_ohlcv(exchange, "BTC", "1m", stored_max + 1, until_ms)
            save_candles(conn, "BTC", "1m", candles)


def _get_btc_1h(conn, since_ms: int, until_ms: int) -> pd.DataFrame | None:
    """Load BTC 1m data and resample to 1H for risk filter."""
    btc_raw = get_candles(conn, "BTC", "1m", since_ms, until_ms)
    if not btc_raw:
        return None
    df = pd.DataFrame(btc_raw)
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df = df.set_index("datetime")
    return _resample(df, "1h")


@router.post("/run", response_model=BacktestRunResponse)
def run_backtest(req: BacktestRequest):
    """Execute backtest for specified coins and date range (non-streaming)."""
    if req.strategy not in VALID_STRATEGIES:
        raise HTTPException(400, f"Unknown strategy: {req.strategy}")

    run_id = str(uuid.uuid4())[:8]
    created_at = datetime.utcnow().isoformat()
    since_ms = date_to_ms(req.start_date)
    until_ms = date_to_ms(req.end_date)

    params = {"seed": req.seed, "leverage": req.leverage, "strategy": req.strategy}

    with get_db() as conn:
        save_backtest_run(conn, run_id, created_at, req.start_date, req.end_date, req.coins, params)

        # Ensure BTC data is synced for risk filter (BTC crash → block altcoin longs)
        exchange = get_exchange()
        _ensure_btc_synced(conn, exchange, since_ms, until_ms)
        btc_df_1h = _get_btc_1h(conn, since_ms, until_ms)

        for symbol in req.coins:
            candles_1m_raw = get_candles(conn, symbol, "1m", since_ms, until_ms)

            if not candles_1m_raw:
                save_coin_summary(conn, run_id, symbol, 0, 0, 0, 0, req.seed)
                continue

            df_1m = pd.DataFrame(candles_1m_raw)
            df_1h, df_15m = _prepare_dfs(df_1m, req.strategy)

            result = run_backtest_for_coin(
                df_1h, df_1m, symbol, req.seed, req.leverage,
                strategy=req.strategy, df_15m=df_15m,
                btc_df_1h=btc_df_1h,
            )
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

        # Build full sync list: always include BTC for risk filter
        sync_coins = list(req.coins)
        btc_added = False
        if "BTC" not in sync_coins:
            sync_coins.insert(0, "BTC")
            btc_added = True

        sync_errors = {}
        total_sync = len(sync_coins)
        for idx, symbol in enumerate(sync_coins):
            label = f"{symbol} (위험 회피 필터용)" if symbol == "BTC" and btc_added else symbol
            pct = int((idx / total_sync) * 50)  # sync = 0~50%
            yield _sse_event({
                "phase": "sync",
                "message": f"[{idx+1}/{total_sync}] {label} 데이터 수집 중...",
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
                    "message": f"[{idx+1}/{total_sync}] {label} 동기화 완료 ({total:,}건)",
                    "progress": int(((idx + 1) / total_sync) * 50),
                    "symbol": symbol,
                })
            except Exception as e:
                sync_errors[symbol] = str(e)
                yield _sse_event({
                    "phase": "sync",
                    "message": f"[{idx+1}/{total_sync}] {label} 에러: {e}",
                    "progress": int(((idx + 1) / total_sync) * 50),
                    "symbol": symbol,
                    "error": True,
                })

        yield _sse_event({"phase": "sync", "message": "데이터 동기화 완료", "progress": 50})

        # --- Phase 2: Backtest ---
        run_id = str(uuid.uuid4())[:8]
        created_at = datetime.utcnow().isoformat()
        strategy = req.strategy
        params = {"seed": req.seed, "leverage": req.leverage, "strategy": strategy}

        yield _sse_event({"phase": "backtest", "message": "백테스트 시작", "progress": 50})

        with get_db() as conn:
            save_backtest_run(conn, run_id, created_at, req.start_date, req.end_date, req.coins, params)

            # Pre-load BTC 1H for risk filter
            btc_df_1h = _get_btc_1h(conn, since_ms, until_ms)

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
                df_1h, df_15m = _prepare_dfs(df_1m, strategy)

                result = run_backtest_for_coin(
                    df_1h, df_1m, symbol, req.seed, req.leverage,
                    strategy=strategy, df_15m=df_15m,
                    btc_df_1h=btc_df_1h,
                )
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
