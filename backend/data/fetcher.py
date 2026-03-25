import ccxt
import time
from datetime import datetime, timezone

from config import EXCHANGE_ID, TOP_COINS


def get_exchange() -> ccxt.Exchange:
    import os
    ca = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE")

    exchange_class = getattr(ccxt, EXCHANGE_ID)
    exchange = exchange_class({
        "enableRateLimit": True,
        "options": {
            "defaultType": "linear",
            "fetchMarkets": ["linear"],
        },
    })
    if ca:
        import os as _os
        ca = _os.path.expanduser(ca)
        if _os.path.exists(ca):
            exchange.session.verify = ca
    return exchange


# Display name → exchange pair name (for tokens traded as 1000x units)
_SYMBOL_ALIAS = {
    "PEPE": "1000PEPE",
}

def symbol_to_pair(symbol: str) -> str:
    """Convert symbol like 'BTC' to exchange pair like 'BTC/USDT:USDT'."""
    exchange_sym = _SYMBOL_ALIAS.get(symbol, symbol)
    return f"{exchange_sym}/USDT:USDT"


def fetch_ohlcv(exchange: ccxt.Exchange, symbol: str, timeframe: str,
                since_ms: int, until_ms: int) -> list[list]:
    """Fetch all OHLCV candles for a symbol between since_ms and until_ms.

    Returns list of [timestamp, open, high, low, close, volume].
    Handles pagination automatically.
    """
    pair = symbol_to_pair(symbol)
    all_candles = []
    current_since = since_ms
    limit = 1000  # max per request

    while current_since < until_ms:
        candles = exchange.fetch_ohlcv(pair, timeframe, since=current_since, limit=limit)
        if not candles:
            break

        # Filter out candles beyond until_ms
        filtered = [c for c in candles if c[0] <= until_ms]
        all_candles.extend(filtered)

        # Stop if no candles in range, or last candle reached/passed until_ms
        if not filtered or filtered[-1][0] >= until_ms:
            break

        # Move to next batch
        current_since = filtered[-1][0] + 1
        time.sleep(exchange.rateLimit / 1000)

    return all_candles


def get_stored_range(conn, symbol: str, timeframe: str) -> tuple[int | None, int | None]:
    """Get the (min, max) timestamp stored in DB for a symbol/timeframe pair."""
    row = conn.execute(
        "SELECT MIN(timestamp) as mn, MAX(timestamp) as mx FROM candles WHERE symbol=? AND timeframe=?",
        (symbol, timeframe),
    ).fetchone()
    if row and row["mn"] is not None:
        return row["mn"], row["mx"]
    return None, None


def fetch_available_symbols(exchange: ccxt.Exchange) -> list[str]:
    """Return list of available symbols from TOP_COINS that exist on exchange."""
    exchange.load_markets()
    available = []
    for symbol in TOP_COINS:
        pair = symbol_to_pair(symbol)
        if pair in exchange.markets:
            available.append(symbol)
    return available


def date_to_ms(date_str: str) -> int:
    """Convert 'YYYY-MM-DD' to milliseconds timestamp (UTC start of day)."""
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def end_date_to_ms(date_str: str) -> int:
    """Convert end date to ms — includes the full day (next day 00:00 UTC - 1ms)."""
    return date_to_ms(date_str) + 86_400_000 - 1
