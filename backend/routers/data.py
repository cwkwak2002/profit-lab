import pandas as pd
import pandas_ta as ta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query

from data.db import get_db, get_candles, save_candles
from data.fetcher import get_exchange, fetch_ohlcv, fetch_available_symbols, date_to_ms, end_date_to_ms, get_stored_range
from config import (
    RSI_PERIOD, BB_PERIOD, BB_STD, EMA_FAST, EMA_SLOW, ADX_PERIOD,
    SQZ_BB_PERIOD, SQZ_BB_STD,
)

router = APIRouter(prefix="/api/data", tags=["data"])


class SyncRequest(BaseModel):
    coins: list[str]
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


class SyncResponse(BaseModel):
    synced: dict[str, dict[str, int]]  # {symbol: {"1h": count, "1m": count}}
    errors: dict[str, str]


@router.post("/sync", response_model=SyncResponse)
def sync_data(req: SyncRequest):
    """Fetch and store OHLCV data for specified coins and date range."""
    exchange = get_exchange()
    since_ms = date_to_ms(req.start_date)
    until_ms = end_date_to_ms(req.end_date)

    synced = {}
    errors = {}

    for symbol in req.coins:
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

                synced[symbol] = {"1m": total}
        except Exception as e:
            errors[symbol] = str(e)

    return SyncResponse(synced=synced, errors=errors)


@router.get("/symbols")
def get_symbols():
    """Return available symbols from exchange."""
    exchange = get_exchange()
    symbols = fetch_available_symbols(exchange)
    return {"symbols": symbols}


RESAMPLE_MAP = {
    "5m": "5min", "15m": "15min", "30m": "30min",
    "1h": "1h", "4h": "4h", "1D": "1D",
}

VALID_TIMEFRAMES = {"1m", "5m", "15m", "30m", "1h", "4h", "1D"}


def _nan_to_none(val):
    if pd.isna(val):
        return None
    return round(val, 4)


@router.get("/candles")
def get_candles_api(
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
    start_date: str = Query(...),
    end_date: str = Query(...),
    strategy: str = Query("rsi_divergence"),
):
    """Return OHLCV candles with strategy-specific indicators."""
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f"Invalid timeframe: {timeframe}")

    since_ms = date_to_ms(start_date)
    until_ms = end_date_to_ms(end_date)

    # Auto-sync missing 1m candles
    with get_db() as conn:
        stored_min, stored_max = get_stored_range(conn, symbol, "1m")
        need_fetch = False
        if stored_min is None:
            need_fetch = True
        else:
            if since_ms < stored_min or until_ms > stored_max:
                need_fetch = True

        if need_fetch:
            try:
                exchange = get_exchange()
                if stored_min is None:
                    candles = fetch_ohlcv(exchange, symbol, "1m", since_ms, until_ms)
                    save_candles(conn, symbol, "1m", candles)
                else:
                    if since_ms < stored_min:
                        candles = fetch_ohlcv(exchange, symbol, "1m", since_ms, stored_min - 1)
                        save_candles(conn, symbol, "1m", candles)
                    if until_ms > stored_max:
                        candles = fetch_ohlcv(exchange, symbol, "1m", stored_max + 1, until_ms)
                        save_candles(conn, symbol, "1m", candles)
            except Exception:
                pass  # Best-effort: return whatever we have

        rows = get_candles(conn, symbol, "1m", since_ms, until_ms)

    if not rows:
        return {"candles": []}

    df = pd.DataFrame(rows)
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df = df.set_index("datetime")

    if timeframe != "1m":
        rule = RESAMPLE_MAP[timeframe]
        df = df.resample(rule).agg({
            "timestamp": "first",
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum",
        }).dropna(subset=["timestamp"])
        df["timestamp"] = df["timestamp"].astype(int)

    # --- Strategy-specific indicators ---
    base_cols = ["timestamp", "open", "high", "low", "close", "volume"]

    if strategy == "ema_trend":
        df["ema50"] = ta.ema(df["close"], length=EMA_FAST)
        df["ema200"] = ta.ema(df["close"], length=EMA_SLOW)
        adx_df = ta.adx(df["high"], df["low"], df["close"], length=ADX_PERIOD)
        df["adx"] = adx_df.iloc[:, 0] if adx_df is not None else None
        extra_cols = ["ema50", "ema200", "adx"]

    elif strategy == "bb_squeeze":
        bb = ta.bbands(df["close"], length=SQZ_BB_PERIOD, std=SQZ_BB_STD)
        if bb is not None:
            df["bb_lower"] = bb.iloc[:, 0]
            df["bb_mid"] = bb.iloc[:, 1]
            df["bb_upper"] = bb.iloc[:, 2]
            df["bb_width"] = ((df["bb_upper"] - df["bb_lower"]) / df["bb_mid"] * 100)
        else:
            df["bb_lower"] = None
            df["bb_mid"] = None
            df["bb_upper"] = None
            df["bb_width"] = None
        extra_cols = ["bb_lower", "bb_mid", "bb_upper", "bb_width"]

    else:  # rsi_divergence (default)
        rsi = ta.rsi(df["close"], length=RSI_PERIOD)
        df["rsi"] = rsi if rsi is not None else None
        extra_cols = ["rsi"]

    all_cols = base_cols + extra_cols
    result = df[all_cols].to_dict("records")

    # Replace NaN with None for JSON
    for r in result:
        for col in extra_cols:
            r[col] = _nan_to_none(r.get(col))

    return {"candles": result}
