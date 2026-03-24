"""Background monitor for AI Benchmark orders.

Runs an asyncio loop that checks live prices every N seconds and
transitions orders through their lifecycle:
  PENDING → FILLED (limit hit) or CANCELLED (30 min timeout)
  FILLED  → CLOSED (TP/SL hit or 6-hour timeout)

Supports dual TP: when tp2_price is set, TP1 hit closes 50% and moves SL to breakeven.
Market orders skip PENDING and start as FILLED.

On startup, replays 1-minute candles to recover missed events during downtime.
"""

import asyncio
import logging
from datetime import datetime, timezone

from config import (
    BENCHMARK_LEVERAGE, TAKER_FEE, SLIPPAGE,
    BENCHMARK_ORDER_TIMEOUT_MIN, BENCHMARK_POSITION_TIMEOUT_MIN,
    BENCHMARK_MONITOR_INTERVAL_SEC,
)
from data.db import get_db, get_active_orders
from data.fetcher import get_exchange, symbol_to_pair, fetch_ohlcv

logger = logging.getLogger("benchmark_monitor")

# SSE subscribers (set of asyncio.Queue)
_subscribers: set[asyncio.Queue] = set()


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.add(q)
    return q


def unsubscribe(q: asyncio.Queue):
    _subscribers.discard(q)


def _broadcast(event: dict):
    for q in list(_subscribers):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass


def _calc_pnl(side: str, entry_price: float, close_price: float,
              margin: float) -> float:
    """Calculate net P&L including fees."""
    position_size = margin * BENCHMARK_LEVERAGE
    direction = 1 if side == "long" else -1
    raw_pnl = position_size * (close_price - entry_price) / entry_price * direction
    fees = position_size * (TAKER_FEE + SLIPPAGE) * 2  # entry + exit
    net_pnl = raw_pnl - fees
    # Cap loss at margin (no negative balance from one order)
    return round(max(net_pnl, -margin), 6)


def _invalidate_order(conn, order: dict):
    """Mark an order as INVALID — fill candle already triggers TP or SL.

    Does NOT affect model balance (INVALID orders are ignored in P&L).
    Clears fill_time / close_time so the order only shows created_at.
    """
    conn.execute(
        """UPDATE benchmark_orders
           SET status='INVALID', fill_time=NULL, close_time=NULL,
               close_price=NULL, close_reason='FILL_CANDLE_TPSL',
               pnl=NULL, pnl_pct=NULL, balance_after=NULL
           WHERE id=?""",
        (order["id"],),
    )
    _broadcast({
        "type": "order_invalid",
        "order_id": order["id"],
        "model_id": order["model_id"],
        "symbol": order["symbol"],
        "reason": "FILL_CANDLE_TPSL",
    })
    logger.info("INVALID order %s (%s %s) — fill candle triggers TP/SL",
                order["id"], order["side"], order["symbol"])


def _fill_candle_triggers_tpsl(order: dict, high: float, low: float) -> bool:
    """Check if a candle's high/low would trigger TP or SL for the order."""
    tp1 = order["tp_price"]
    sl = order["sl_price"]
    is_long = order["side"] == "long"

    if is_long:
        return high >= tp1 or low <= sl
    else:
        return low <= tp1 or high >= sl


def _close_order(conn, order: dict, close_price: float, reason: str, now_iso: str):
    """Close a FILLED order: compute P&L, update balance, broadcast."""
    margin = order["margin"]
    pnl = _calc_pnl(order["side"], order["entry_price"], close_price, margin)

    # If TP1 was already hit, total PnL includes the previously realized tp1_pnl
    tp1_pnl = order.get("tp1_pnl") or 0
    total_pnl = round(pnl + tp1_pnl, 6)
    # original margin for pct calculation
    original_margin = margin * 2 if order.get("tp1_hit") else margin
    pnl_pct = round(total_pnl / original_margin * 100, 2) if original_margin else 0

    # Update model balance (only the new pnl portion — tp1_pnl was already credited)
    model = conn.execute("SELECT * FROM benchmark_models WHERE id=?",
                         (order["model_id"],)).fetchone()
    new_balance = round(dict(model)["balance"] + pnl, 6)
    conn.execute("UPDATE benchmark_models SET balance=? WHERE id=?",
                 (new_balance, order["model_id"]))

    conn.execute(
        """UPDATE benchmark_orders
           SET status='CLOSED', close_time=?, close_price=?, close_reason=?,
               pnl=?, pnl_pct=?, balance_after=?
           WHERE id=?""",
        (now_iso, close_price, reason, total_pnl, pnl_pct, new_balance, order["id"]),
    )

    _broadcast({
        "type": "order_closed",
        "order_id": order["id"],
        "model_id": order["model_id"],
        "symbol": order["symbol"],
        "side": order["side"],
        "close_price": close_price,
        "close_reason": reason,
        "pnl": total_pnl,
        "pnl_pct": pnl_pct,
        "balance_after": new_balance,
    })
    logger.info("CLOSED order %s (%s %s) reason=%s pnl=%.4f",
                order["id"], order["side"], order["symbol"], reason, total_pnl)


def _handle_tp1_hit(conn, order: dict, tp1_price: float, now_iso: str):
    """Handle TP1 hit on a dual-TP order: close 50%, move SL to breakeven."""
    half_margin = round(order["margin"] / 2, 6)
    tp1_pnl = _calc_pnl(order["side"], order["entry_price"], tp1_price, half_margin)

    # Credit TP1 PnL to model balance
    model = conn.execute("SELECT * FROM benchmark_models WHERE id=?",
                         (order["model_id"],)).fetchone()
    new_balance = round(dict(model)["balance"] + tp1_pnl, 6)
    conn.execute("UPDATE benchmark_models SET balance=? WHERE id=?",
                 (new_balance, order["model_id"]))

    # Update order: mark TP1 hit, halve margin, move SL to breakeven
    conn.execute(
        """UPDATE benchmark_orders
           SET tp1_hit=1, tp1_pnl=?, margin=?, sl_price=?, balance_after=?
           WHERE id=?""",
        (tp1_pnl, half_margin, order["entry_price"], new_balance, order["id"]),
    )

    _broadcast({
        "type": "tp1_hit",
        "order_id": order["id"],
        "model_id": order["model_id"],
        "symbol": order["symbol"],
        "tp1_pnl": tp1_pnl,
        "new_sl": order["entry_price"],
        "remaining_margin": half_margin,
    })
    logger.info("TP1 HIT order %s (%s %s) tp1_pnl=%.4f, SL→breakeven",
                order["id"], order["side"], order["symbol"], tp1_pnl)


# ---------------------------------------------------------------------------
# Downtime recovery: replay 1-minute candles to catch missed events
# ---------------------------------------------------------------------------

async def _recover_from_downtime(exchange):
    """On startup, fetch 1m candles since each active order's last known
    timestamp and replay them to resolve any missed fills/closes."""
    with get_db() as conn:
        orders = get_active_orders(conn)
        if not orders:
            logger.info("Recovery: no active orders")
            return

        now = datetime.now(timezone.utc)
        now_ms = int(now.timestamp() * 1000)

        # Determine the earliest relevant timestamp per symbol
        symbol_since: dict[str, int] = {}
        for o in orders:
            if o["status"] == "PENDING":
                start = datetime.fromisoformat(o["created_at"])
            else:  # FILLED
                start = datetime.fromisoformat(o["fill_time"])
            since_ms = int(start.timestamp() * 1000)
            sym = o["symbol"]
            if sym not in symbol_since or since_ms < symbol_since[sym]:
                symbol_since[sym] = since_ms

        # Fetch 1m candles per symbol (skip if gap < 2 minutes — not a real downtime)
        loop = asyncio.get_event_loop()
        candles_by_symbol: dict[str, list[list]] = {}
        for sym, since_ms in symbol_since.items():
            if now_ms - since_ms < 120_000:
                continue
            try:
                candles = await loop.run_in_executor(
                    None, fetch_ohlcv, exchange, sym, "1m", since_ms, now_ms,
                )
                if candles:
                    candles_by_symbol[sym] = candles
                    logger.info("Recovery: fetched %d 1m candles for %s", len(candles), sym)
            except Exception:
                logger.exception("Recovery: failed to fetch candles for %s", sym)

        if not candles_by_symbol:
            logger.info("Recovery: no candles needed")
            return

        # Process each order against its candles
        recovered = 0
        for o in orders:
            candles = candles_by_symbol.get(o["symbol"])
            if not candles:
                continue
            # Re-read in case a previous iteration changed this order's state
            fresh = conn.execute(
                "SELECT * FROM benchmark_orders WHERE id=?", (o["id"],)
            ).fetchone()
            if not fresh:
                continue
            order = dict(fresh)
            if order["status"] not in ("PENDING", "FILLED"):
                continue
            if _recover_single_order(conn, order, candles):
                recovered += 1

        if recovered:
            logger.info("Recovery complete: %d orders resolved", recovered)
        else:
            logger.info("Recovery complete: no state changes needed")


def _recover_single_order(conn, order: dict, candles: list[list]) -> bool:
    """Walk 1m candles to recover a single order. Returns True if state changed."""
    if order["status"] == "PENDING":
        return _recover_pending(conn, order, candles)
    elif order["status"] == "FILLED":
        return _recover_filled(conn, order, candles)
    return False


def _recover_pending(conn, order: dict, candles: list[list]) -> bool:
    """Replay candles for a PENDING order: check fill or 30-min cancel."""
    created = datetime.fromisoformat(order["created_at"])
    created_ms = int(created.timestamp() * 1000)
    entry = order["entry_price"]
    is_long = order["side"] == "long"

    for candle in candles:
        ts, _o, h, l, _c, _v = candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]
        if ts <= created_ms:
            continue

        candle_time = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        elapsed_min = (candle_time - created).total_seconds() / 60

        # 30-min timeout → cancel
        if elapsed_min >= BENCHMARK_ORDER_TIMEOUT_MIN:
            candle_iso = candle_time.isoformat()
            conn.execute(
                """UPDATE benchmark_orders
                   SET status='CANCELLED', close_time=?, close_reason='CANCEL_30M'
                   WHERE id=?""",
                (candle_iso, order["id"]),
            )
            _broadcast({"type": "order_cancelled", "order_id": order["id"],
                        "model_id": order["model_id"], "symbol": order["symbol"],
                        "close_reason": "CANCEL_30M"})
            logger.info("Recovery: CANCELLED order %s (30min timeout)", order["id"])
            return True

        # Check fill: long fills when price dips to entry, short when price rises
        filled = (is_long and l <= entry) or (not is_long and h >= entry)
        if filled:
            # Check if this same candle also triggers TP/SL → INVALID
            if _fill_candle_triggers_tpsl(order, h, l):
                _invalidate_order(conn, order)
                return True

            candle_iso = candle_time.isoformat()
            conn.execute(
                "UPDATE benchmark_orders SET status='FILLED', fill_time=? WHERE id=?",
                (candle_iso, order["id"]),
            )
            _broadcast({"type": "order_filled", "order_id": order["id"],
                        "model_id": order["model_id"], "symbol": order["symbol"],
                        "side": order["side"], "entry_price": entry,
                        "fill_time": candle_iso})
            logger.info("Recovery: FILLED order %s at %s", order["id"], candle_iso)

            # Continue processing as FILLED with remaining candles
            order["status"] = "FILLED"
            order["fill_time"] = candle_iso
            remaining = [c for c in candles if c[0] > ts]
            if remaining:
                _recover_filled(conn, order, remaining)
            return True

    return False


def _recover_filled(conn, order: dict, candles: list[list]) -> bool:
    """Replay candles for a FILLED order: check TP/SL/timeout.

    When both TP and SL could trigger in the same candle, SL takes priority
    (conservative — avoids inflating benchmark results).
    """
    fill_time = datetime.fromisoformat(order["fill_time"])
    fill_ms = int(fill_time.timestamp() * 1000)
    fill_candle_start = (fill_ms // 60_000) * 60_000
    # Check the fill candle for TP/SL — if it triggers, mark INVALID
    checked_fill_candle = False
    tp1 = order["tp_price"]
    tp2 = order.get("tp2_price")
    sl = order["sl_price"]
    has_dual_tp = tp2 is not None
    tp1_already_hit = bool(order.get("tp1_hit"))
    is_long = order["side"] == "long"

    for candle in candles:
        ts, _o, h, l, c, _v = candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]

        # Check the fill candle: if TP/SL triggers on this candle → INVALID
        if ts == fill_candle_start and not checked_fill_candle:
            checked_fill_candle = True
            if _fill_candle_triggers_tpsl(order, h, l):
                _invalidate_order(conn, order)
                return True
            continue  # skip normal TP/SL processing for the fill candle

        if ts <= fill_candle_start:
            continue

        candle_time = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        candle_iso = candle_time.isoformat()
        elapsed_min = (candle_time - fill_time).total_seconds() / 60

        if not has_dual_tp:
            # --- Single TP ---
            sl_hit = (is_long and l <= sl) or (not is_long and h >= sl)
            tp_hit = (is_long and h >= tp1) or (not is_long and l <= tp1)

            if sl_hit:  # SL priority
                _close_order(conn, order, sl, "SL", candle_iso)
                return True
            if tp_hit:
                _close_order(conn, order, tp1, "TP", candle_iso)
                return True

        elif not tp1_already_hit:
            # --- Dual TP, TP1 not yet hit ---
            sl_hit = (is_long and l <= sl) or (not is_long and h >= sl)
            tp1_hit = (is_long and h >= tp1) or (not is_long and l <= tp1)

            if sl_hit:
                _close_order(conn, order, sl, "SL", candle_iso)
                return True
            if tp1_hit:
                _handle_tp1_hit(conn, order, tp1, candle_iso)
                tp1_already_hit = True
                # Re-read order for updated margin/sl
                fresh = conn.execute(
                    "SELECT * FROM benchmark_orders WHERE id=?", (order["id"],)
                ).fetchone()
                if fresh:
                    order = dict(fresh)
                    sl = order["sl_price"]  # now at breakeven
                continue

        else:
            # --- Dual TP, TP1 already hit (SL = breakeven) ---
            breakeven_sl = order["entry_price"]
            sl_hit = (is_long and l <= breakeven_sl) or (not is_long and h >= breakeven_sl)
            tp2_hit = (is_long and h >= tp2) or (not is_long and l <= tp2)

            if sl_hit:
                _close_order(conn, order, breakeven_sl, "SL_BE", candle_iso)
                return True
            if tp2_hit:
                _close_order(conn, order, tp2, "TP2", candle_iso)
                return True

        # 6-hour timeout
        if elapsed_min >= BENCHMARK_POSITION_TIMEOUT_MIN:
            if tp1_already_hit:
                fresh = conn.execute(
                    "SELECT * FROM benchmark_orders WHERE id=?", (order["id"],)
                ).fetchone()
                if fresh:
                    order = dict(fresh)
            _close_order(conn, order, c, "TIMEOUT_6H", candle_iso)
            return True

    return False


# ---------------------------------------------------------------------------
# Main loop & real-time tick
# ---------------------------------------------------------------------------

async def monitor_loop():
    """Main monitoring loop — runs until cancelled."""
    logger.info("Benchmark monitor started")
    exchange = get_exchange()

    # Recover missed events from downtime using 1m candles
    try:
        await _recover_from_downtime(exchange)
    except Exception:
        logger.exception("Recovery failed — continuing with live monitoring")

    while True:
        try:
            await _tick(exchange)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Monitor tick error")
        await asyncio.sleep(BENCHMARK_MONITOR_INTERVAL_SEC)


async def _tick(exchange):
    """Single monitoring tick."""
    with get_db() as conn:
        orders = get_active_orders(conn)
        if not orders:
            return

        # Collect unique symbols
        symbols = list({o["symbol"] for o in orders})
        pairs = [symbol_to_pair(s) for s in symbols]

        # Fetch tickers (run in executor since ccxt is sync)
        loop = asyncio.get_event_loop()
        tickers = await loop.run_in_executor(None, exchange.fetch_tickers, pairs)

        # Build symbol → last price map
        price_map: dict[str, float] = {}
        for sym in symbols:
            pair = symbol_to_pair(sym)
            if pair in tickers and tickers[pair].get("last"):
                price_map[sym] = tickers[pair]["last"]

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        for order in orders:
            price = price_map.get(order["symbol"])
            if price is None:
                continue

            if order["status"] == "PENDING":
                _process_pending(conn, order, price, now, now_iso)
            elif order["status"] == "FILLED":
                _process_filled(conn, order, price, now, now_iso)


def _process_pending(conn, order: dict, price: float,
                     now: datetime, now_iso: str):
    """Check if a PENDING order should be filled or cancelled."""
    created = datetime.fromisoformat(order["created_at"])
    elapsed_min = (now - created).total_seconds() / 60

    # Timeout → cancel
    if elapsed_min >= BENCHMARK_ORDER_TIMEOUT_MIN:
        conn.execute(
            """UPDATE benchmark_orders
               SET status='CANCELLED', close_time=?, close_reason='CANCEL_30M'
               WHERE id=?""",
            (now_iso, order["id"]),
        )
        _broadcast({
            "type": "order_cancelled",
            "order_id": order["id"],
            "model_id": order["model_id"],
            "symbol": order["symbol"],
            "close_reason": "CANCEL_30M",
        })
        logger.info("CANCELLED order %s (30min timeout)", order["id"])
        return

    # Check fill: price crosses entry
    entry = order["entry_price"]
    if order["side"] == "long":
        filled = price <= entry  # price dips to or below entry
    else:
        filled = price >= entry  # price rises to or above entry

    if filled:
        conn.execute(
            "UPDATE benchmark_orders SET status='FILLED', fill_time=? WHERE id=?",
            (now_iso, order["id"]),
        )
        _broadcast({
            "type": "order_filled",
            "order_id": order["id"],
            "model_id": order["model_id"],
            "symbol": order["symbol"],
            "side": order["side"],
            "entry_price": entry,
            "fill_time": now_iso,
        })
        logger.info("FILLED order %s (%s %s @ %.4f)",
                     order["id"], order["side"], order["symbol"], entry)


def _process_filled(conn, order: dict, price: float,
                    now: datetime, now_iso: str):
    """Check if a FILLED order should be closed (TP/SL/timeout).

    Supports dual TP: if tp2_price is set:
      - TP1 hit → close 50%, move SL to breakeven
      - TP2 hit → close remaining 50%
      - SL after TP1 → close at breakeven

    To avoid false triggers on the same 1m candle as the fill,
    skip TP/SL checks until at least 60 seconds after fill.
    """
    fill_time = datetime.fromisoformat(order["fill_time"])
    elapsed_sec = (now - fill_time).total_seconds()
    elapsed_min = elapsed_sec / 60

    # During the fill candle (< 60s after fill): check if TP/SL would trigger
    # on this same candle — if so, mark as INVALID (AI used stale price data)
    if elapsed_sec < 60:
        tp1 = order["tp_price"]
        sl = order["sl_price"]
        is_long = order["side"] == "long"
        if is_long:
            if price >= tp1 or price <= sl:
                _invalidate_order(conn, order)
        else:
            if price <= tp1 or price >= sl:
                _invalidate_order(conn, order)
        return

    tp1 = order["tp_price"]
    tp2 = order.get("tp2_price")
    sl = order["sl_price"]
    has_dual_tp = tp2 is not None
    tp1_already_hit = bool(order.get("tp1_hit"))
    is_long = order["side"] == "long"

    if not has_dual_tp:
        # Single TP — original behavior
        if is_long:
            if price >= tp1:
                _close_order(conn, order, tp1, "TP", now_iso)
                return
            if price <= sl:
                _close_order(conn, order, sl, "SL", now_iso)
                return
        else:
            if price <= tp1:
                _close_order(conn, order, tp1, "TP", now_iso)
                return
            if price >= sl:
                _close_order(conn, order, sl, "SL", now_iso)
                return

    elif not tp1_already_hit:
        # Dual TP, TP1 not yet hit
        if is_long:
            if price >= tp1:
                _handle_tp1_hit(conn, order, tp1, now_iso)
                return
            if price <= sl:
                _close_order(conn, order, sl, "SL", now_iso)
                return
        else:
            if price <= tp1:
                _handle_tp1_hit(conn, order, tp1, now_iso)
                return
            if price >= sl:
                _close_order(conn, order, sl, "SL", now_iso)
                return

    else:
        # Dual TP, TP1 already hit — SL is now at breakeven (entry_price)
        # Re-read order from DB to get updated margin/sl after tp1_hit
        fresh = conn.execute("SELECT * FROM benchmark_orders WHERE id=?",
                             (order["id"],)).fetchone()
        if fresh:
            order = dict(fresh)

        breakeven_sl = order["entry_price"]
        if is_long:
            if price >= tp2:
                _close_order(conn, order, tp2, "TP2", now_iso)
                return
            if price <= breakeven_sl:
                _close_order(conn, order, breakeven_sl, "SL_BE", now_iso)
                return
        else:
            if price <= tp2:
                _close_order(conn, order, tp2, "TP2", now_iso)
                return
            if price >= breakeven_sl:
                _close_order(conn, order, breakeven_sl, "SL_BE", now_iso)
                return

    # 6-hour timeout
    if elapsed_min >= BENCHMARK_POSITION_TIMEOUT_MIN:
        if tp1_already_hit:
            # Re-read for updated margin
            fresh = conn.execute("SELECT * FROM benchmark_orders WHERE id=?",
                                 (order["id"],)).fetchone()
            if fresh:
                order = dict(fresh)
        _close_order(conn, order, price, "TIMEOUT_6H", now_iso)
