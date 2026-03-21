from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data.db import get_db, save_candles
from data.fetcher import get_exchange, fetch_ohlcv, fetch_available_symbols, date_to_ms

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
                # Fetch 1h candles
                candles_1h = fetch_ohlcv(exchange, symbol, "1h", since_ms, until_ms)
                save_candles(conn, symbol, "1h", candles_1h)

                # Fetch 1m candles
                candles_1m = fetch_ohlcv(exchange, symbol, "1m", since_ms, until_ms)
                save_candles(conn, symbol, "1m", candles_1m)

                synced[symbol] = {"1h": len(candles_1h), "1m": len(candles_1m)}
        except Exception as e:
            errors[symbol] = str(e)

    return SyncResponse(synced=synced, errors=errors)


@router.get("/symbols")
def get_symbols():
    """Return available symbols from exchange."""
    exchange = get_exchange()
    symbols = fetch_available_symbols(exchange)
    return {"symbols": symbols}
