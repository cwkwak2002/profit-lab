"""Telegram listener for Mirroly Live channel.

Connects as a regular Telegram user (not a bot) to read messages from a
channel the user is a member of.  Parses entry/exit signals and submits
market orders to the benchmark system.

Required env vars (set in .env):
    TELEGRAM_API_ID      — from https://my.telegram.org
    TELEGRAM_API_HASH    — from https://my.telegram.org
    TELEGRAM_CHANNEL     — channel username (e.g. "MirrolyLive") or numeric ID

First-time setup:
    python -m engine.telegram_listener
    → prompts for phone number and verification code once, then saves a session file.
"""

import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from config import BENCHMARK_SEED, BENCHMARK_LEVERAGE, TOP_COINS
from data.db import (
    get_db,
    get_or_create_model,
    get_active_margin,
    insert_benchmark_batch,
    insert_benchmark_order,
)
from data.fetcher import get_exchange, symbol_to_pair

logger = logging.getLogger(__name__)

MODEL_NAME = "Mirroly Live"
MARGIN_RATIO = 0.5  # 50% of current balance per trade
SESSION_PATH = Path(__file__).parent.parent.parent / "data" / "telegram.session"
LOG_DIR = Path(__file__).parent.parent.parent / "data" / "telegram_logs"


# ── Signal parsing ──────────────────────────────────────────────────────────

# Mirroly Live message patterns (real examples):
#   New format:
#     Entry: "Steel Shark opened a BTC SHORT for $1,411,934 Entry 70,596.713"
#     Exit:  "Steel Shark closed a BTC SHORT"
#   Old format:
#     Entry: "now longing HYPE at $213,140 at $38.038 (Hyperliquid). on a heater."
#            "now shorting BTC at $525,034 at $70,037.207 (Hyperliquid)."
#     Exit:  "closed HYPE long at ..." / "closed BTC short at ..."

# New format: "{ID} opened a {COIN} {LONG|SHORT} ..."
_MIRROLY_OPEN_RE = re.compile(
    r"^(.+?)\s+opened\s+a\s+(\w+)\s+(LONG|SHORT)",
    re.IGNORECASE,
)

# New format: "{ID} closed a {COIN} {LONG|SHORT}" or "{ID} closed {COIN} {LONG|SHORT}"
_MIRROLY_CLOSE_RE = re.compile(
    r"^(.+?)\s+closed\s+(?:a\s+)?(\w+)(?:\s+(LONG|SHORT))?",
    re.IGNORECASE,
)

# Old format entry: "longing <COIN>" or "shorting <COIN>"
_MIRROLY_ENTRY_RE = re.compile(
    r"(?:now\s+)?(longing|shorting)\s+(\w+)",
    re.IGNORECASE,
)

# Old format exit: "closed <COIN> <side>" or "closed <COIN>"
_MIRROLY_EXIT_RE = re.compile(
    r"closed\s+(\w+)(?:\s+(long|short))?",
    re.IGNORECASE,
)

# Generic entry patterns (fallback)
_ENTRY_RE = re.compile(
    r"(?:🟢|📈|📉|open|entry|진입|매수|매도)\s+"
    r"(?:(\w+)[/ ]?USDT?\s+)?"
    r"(LONG|SHORT|long|short|Long|Short)"
    r"(?:\s+(\w+))?",
    re.IGNORECASE,
)

# Generic exit patterns (fallback)
_EXIT_RE = re.compile(
    r"(?:🔴|❌|close|exit|청산|종료)\s+"
    r"(?:(\w+)[/ ]?USDT?\s*)?"
    r"(LONG|SHORT|long|short|Long|Short)?"
    r"(?:\s+(\w+))?",
    re.IGNORECASE,
)


def _normalize_coin(raw: str | None) -> str | None:
    """Normalize coin name: strip /USDT suffix, uppercase."""
    if not raw:
        return None
    coin = raw.upper().replace("/USDT", "").replace("USDT", "").strip()
    # Handle 1000-prefix tokens
    if coin == "PEPE":
        return "PEPE"
    return coin if coin in set(TOP_COINS) else None


def parse_signal(text: str) -> dict | None:
    """Parse a Telegram message into a trading signal.

    Returns dict with keys:
        action:     "entry" or "exit"
        coin:       normalized coin name (e.g. "BTC")
        side:       "long" or "short" (may be None for exit)
        trader_id:  trader name from message (e.g. "Steel Shark"), or None
    Or None if the message is not a trading signal.
    """
    text_clean = text.strip()

    # 1. New format: "{ID} opened a {COIN} {LONG|SHORT} ..."
    m = _MIRROLY_OPEN_RE.search(text_clean)
    if m:
        trader_id = m.group(1).strip()
        coin = _normalize_coin(m.group(2))
        side = m.group(3).lower()
        if coin:
            return {"action": "entry", "coin": coin, "side": side, "trader_id": trader_id}

    # 2. New format: "{ID} closed (a) {COIN} {LONG|SHORT}"
    m = _MIRROLY_CLOSE_RE.search(text_clean)
    if m:
        trader_id = m.group(1).strip()
        coin = _normalize_coin(m.group(2))
        side = m.group(3).lower() if m.group(3) else None
        if coin:
            return {"action": "exit", "coin": coin, "side": side, "trader_id": trader_id}

    # 3. Old format: "closed <COIN> <side>"
    m = _MIRROLY_EXIT_RE.search(text_clean)
    if m:
        coin = _normalize_coin(m.group(1))
        side = m.group(2).lower() if m.group(2) else None
        if coin:
            return {"action": "exit", "coin": coin, "side": side, "trader_id": None}

    # 4. Old format: "longing/shorting <COIN>"
    m = _MIRROLY_ENTRY_RE.search(text_clean)
    if m:
        direction = m.group(1).lower()
        coin = _normalize_coin(m.group(2))
        side = "long" if direction == "longing" else "short"
        if coin:
            return {"action": "entry", "coin": coin, "side": side, "trader_id": None}

    # 5. Generic exit fallback
    m = _EXIT_RE.search(text_clean)
    if m:
        coin = _normalize_coin(m.group(1) or m.group(3))
        side = m.group(2).lower() if m.group(2) else None
        if coin:
            return {"action": "exit", "coin": coin, "side": side, "trader_id": None}

    # 6. Generic entry fallback
    m = _ENTRY_RE.search(text_clean)
    if m:
        coin = _normalize_coin(m.group(1) or m.group(3))
        side = m.group(2).lower() if m.group(2) else None
        if coin and side:
            return {"action": "entry", "coin": coin, "side": side, "trader_id": None}

    return None


# ── Market price ────────────────────────────────────────────────────────────

def _get_market_price(coin: str) -> float | None:
    """Fetch current market price from Bybit."""
    try:
        exchange = get_exchange()
        ticker = exchange.fetch_ticker(symbol_to_pair(coin))
        return ticker["last"] if ticker else None
    except Exception as e:
        logger.error("Failed to fetch price for %s: %s", coin, e)
        return None


# ── Order handling ──────────────────────────────────────────────────────────

def _handle_entry(coin: str, side: str, raw_message: str, trader_id: str | None = None) -> str | None:
    """Open a new position at market price. Returns action summary for logging."""
    price = _get_market_price(coin)
    if price is None:
        logger.warning("Cannot get market price for %s — skipping entry", coin)
        return f"{coin} {side} entry skipped — no market price"

    now = datetime.now(timezone.utc).isoformat()
    batch_id = str(uuid.uuid4())[:8]

    # Description prefix: "$Steel Shark / " if trader_id is known
    id_prefix = f"${trader_id} / " if trader_id else ""

    with get_db() as conn:
        model = get_or_create_model(conn, MODEL_NAME, BENCHMARK_SEED, BENCHMARK_LEVERAGE)
        model_id = model["id"]

        # Check for duplicate: same trader_id+coin+side already FILLED
        if trader_id:
            existing = conn.execute(
                "SELECT id FROM benchmark_orders WHERE model_id=? AND symbol=? AND side=? AND status='FILLED' AND source='telegram' AND description LIKE ?",
                (model_id, coin, side, f"{id_prefix}%"),
            ).fetchone()
        else:
            existing = conn.execute(
                "SELECT id FROM benchmark_orders WHERE model_id=? AND symbol=? AND side=? AND status='FILLED' AND source='telegram'",
                (model_id, coin, side),
            ).fetchone()
        if existing:
            logger.info("Already have open %s %s position — skipping", coin, side)
            return f"{coin} {side} entry skipped — duplicate position"

        # Margin = 50% of current balance
        active_margin = get_active_margin(conn, model_id)
        available = model["balance"] - active_margin
        margin = round(available * MARGIN_RATIO, 4)
        if margin <= 0:
            logger.warning("No available balance for %s — skipping", MODEL_NAME)
            return f"{coin} {side} entry skipped — no available balance (balance={model['balance']:.4f}, active_margin={active_margin:.4f})"

        insert_benchmark_batch(conn, {
            "id": batch_id,
            "model_id": model_id,
            "market_analysis": f"{id_prefix}{raw_message}",
            "created_at": now,
        })

        insert_benchmark_order(conn, {
            "model_id": model_id,
            "batch_id": batch_id,
            "symbol": coin,
            "side": side,
            "entry_price": price,
            "tp_price": 0,  # no TP — exit via telegram signal
            "sl_price": 0,  # no SL — exit via telegram signal
            "description": f"{id_prefix}[MARKET ENTRY] {raw_message[:200]}",
            "margin": margin,
            "status": "FILLED",
            "created_at": now,
            "order_type": "market",
            "confidence": 3,
            "tp2_price": None,
            "fill_time": now,
            "source": "telegram",
        })

        new_balance = model["balance"]  # balance not changed on entry

    logger.info("Mirroly ENTRY: %s %s %s @ %.6f (margin=%.4f)", trader_id or "?", side.upper(), coin, price, margin)
    return f"{id_prefix}{coin} {side} {price} open, margin {margin:.4f}, balance {new_balance:.4f}"


def _handle_exit(coin: str, side: str | None, raw_message: str, trader_id: str | None = None):
    """Close an open position at market price."""
    price = _get_market_price(coin)
    if price is None:
        logger.warning("Cannot get market price for %s — skipping exit", coin)
        return

    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        model = get_or_create_model(conn, MODEL_NAME, BENCHMARK_SEED, BENCHMARK_LEVERAGE)
        model_id = model["id"]

        # Find open position: match by trader_id+coin+side when trader_id is known
        query = "SELECT * FROM benchmark_orders WHERE model_id=? AND symbol=? AND status='FILLED' AND source='telegram'"
        params: list = [model_id, coin]
        if trader_id:
            query += " AND description LIKE ?"
            params.append(f"${trader_id} /%")
        if side:
            query += " AND side=?"
            params.append(side)
        query += " ORDER BY fill_time ASC LIMIT 1"

        order = conn.execute(query, params).fetchone()
        if not order:
            logger.info("No open Mirroly position for %s — skipping exit", coin)
            return
        order = dict(order)

        # Calculate P&L
        entry_price = order["entry_price"]
        margin = order["margin"]
        leverage = BENCHMARK_LEVERAGE
        position_size = margin * leverage

        if order["side"] == "long":
            raw_pnl = position_size * (price - entry_price) / entry_price
        else:
            raw_pnl = position_size * (entry_price - price) / entry_price

        # Apply fees (same as benchmark_monitor)
        from config import TAKER_FEE, SLIPPAGE
        fee_rate = (TAKER_FEE + SLIPPAGE) * 2
        fees = position_size * fee_rate
        net_pnl = round(max(raw_pnl - fees, -margin), 6)
        pnl_pct = round(net_pnl / margin * 100, 2) if margin > 0 else 0

        is_profit = net_pnl >= 0
        close_reason = "TP" if is_profit else "SL"

        # Update balance
        new_balance = model["balance"] + net_pnl
        conn.execute("UPDATE benchmark_models SET balance=? WHERE id=?", (new_balance, model_id))

        # Update order: set close info, and record close price in tp_price or sl_price
        conn.execute(
            """UPDATE benchmark_orders
               SET status='CLOSED', close_time=?, close_price=?, close_reason=?,
                   pnl=?, pnl_pct=?, balance_after=?,
                   tp_price=?, sl_price=?,
                   description=description || char(10) || ?
               WHERE id=?""",
            (
                now, price, close_reason,
                net_pnl, pnl_pct, round(new_balance, 6),
                price if is_profit else 0,
                price if not is_profit else 0,
                f"[MARKET EXIT] {raw_message[:200]}",
                order["id"],
            ),
        )

    logger.info(
        "Mirroly EXIT: %s %s @ %.6f → PnL %.4f (%s)",
        order["side"].upper(), coin, price, net_pnl, close_reason,
    )


# ── Log ─────────────────────────────────────────────────────────────────────

def _save_message_log(text: str, signal: dict | None, action_summary: str | None = None):
    """Save every incoming message and action taken for debugging."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d_%H%M%S")
    filepath = LOG_DIR / f"{ts}.json"
    data = {
        "timestamp": now.isoformat(),
        "raw_message": text,
        "parsed_signal": signal,
        "action": action_summary,
    }
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Telegram client ─────────────────────────────────────────────────────────

async def _on_message(text: str):
    """Handle a new message from the Mirroly channel."""
    signal = parse_signal(text)
    _save_message_log(text, signal)

    if signal is None:
        return

    logger.info("Mirroly signal: %s", signal)

    trader_id = signal.get("trader_id")
    if signal["action"] == "entry":
        await asyncio.to_thread(_handle_entry, signal["coin"], signal["side"], text, trader_id)
    elif signal["action"] == "exit":
        await asyncio.to_thread(_handle_exit, signal["coin"], signal.get("side"), text, trader_id)


async def telegram_listener_loop():
    """Background task: listen to Mirroly Live Telegram channel."""
    api_id = os.environ.get("TELEGRAM_API_ID", "")
    api_hash = os.environ.get("TELEGRAM_API_HASH", "")
    channel = os.environ.get("TELEGRAM_CHANNEL", "")

    if not api_id or not api_hash or not channel:
        logger.warning(
            "TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_CHANNEL not set — "
            "Mirroly Live listener disabled"
        )
        return

    try:
        from telethon import TelegramClient, events
    except ImportError:
        logger.error("telethon not installed — run: pip install telethon")
        return

    client = TelegramClient(str(SESSION_PATH), int(api_id), api_hash)

    @client.on(events.NewMessage(chats=channel))
    async def handler(event):
        try:
            await _on_message(event.raw_text)
        except Exception:
            logger.exception("Error processing Telegram message")

    logger.info("Mirroly Live listener starting (channel=%s)…", channel)
    await client.start()
    logger.info("Mirroly Live listener connected")

    await client.run_until_disconnected()


# ── First-time session setup ────────────────────────────────────────────────

if __name__ == "__main__":
    """Run interactively to create the Telegram session file."""
    import sys
    from pathlib import Path

    # Load .env
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent.parent / ".env")

    api_id = os.environ.get("TELEGRAM_API_ID", "")
    api_hash = os.environ.get("TELEGRAM_API_HASH", "")

    if not api_id or not api_hash:
        print("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first")
        sys.exit(1)

    from telethon import TelegramClient

    async def setup():
        client = TelegramClient(str(SESSION_PATH), int(api_id), api_hash)
        await client.start()
        me = await client.get_me()
        print(f"Logged in as: {me.first_name} ({me.phone})")
        print(f"Session saved to: {SESSION_PATH}")
        await client.disconnect()

    asyncio.run(setup())
