import pandas as pd
import pandas_ta as ta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query

from data.db import get_db, get_candles, save_candles
from data.fetcher import get_exchange, fetch_ohlcv, fetch_available_symbols, date_to_ms, get_stored_range

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
    until_ms = date_to_ms(req.end_date)

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


@router.get("/candles")
def get_candles_api(
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """Return OHLCV candles with RSI(14) from DB. Resamples from 1m for non-native timeframes."""
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f"Invalid timeframe: {timeframe}")

    since_ms = date_to_ms(start_date)
    until_ms = date_to_ms(end_date)

    with get_db() as conn:
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

    # Compute RSI(14)
    rsi = ta.rsi(df["close"], length=14)
    if rsi is not None:
        df["rsi"] = rsi.round(2)
    else:
        df["rsi"] = None

    result = df[["timestamp", "open", "high", "low", "close", "volume", "rsi"]].to_dict("records")
    # Replace NaN with None for JSON
    for r in result:
        if pd.isna(r.get("rsi")):
            r["rsi"] = None

    return {"candles": result}
