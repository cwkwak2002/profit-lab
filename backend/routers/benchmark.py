"""AI Trading Benchmark — REST endpoints for model management and order submission."""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config import BENCHMARK_SEED, BENCHMARK_LEVERAGE, TAKER_FEE, SLIPPAGE, TOP_COINS
from data.db import (
    get_db, get_or_create_model, get_benchmark_model, get_all_benchmark_models,
    get_benchmark_model_names, get_active_margin, insert_benchmark_order,
    insert_benchmark_batch, get_model_batches, get_model_orders,
    get_benchmark_order, get_benchmark_batch,
    update_benchmark_order, update_benchmark_batch,
    cancel_batch_pending_orders, delete_benchmark_batch,
    rename_benchmark_model, delete_benchmark_model,
)
from engine.benchmark_monitor import subscribe, unsubscribe

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])


# --- Pydantic models ---

class OrderInput(BaseModel):
    symbol: str
    side: Literal["long", "short"]
    entry_price: float
    tp_price: float
    sl_price: float
    description: str = ""
    order_type: Literal["limit", "market"] = "limit"
    confidence: int = Field(default=3, ge=1, le=5)
    tp2_price: float | None = None


class UpdateOrderRequest(BaseModel):
    """Fields that can be updated on an order. All optional."""
    symbol: str | None = None
    side: Literal["long", "short"] | None = None
    entry_price: float | None = None
    tp_price: float | None = None
    sl_price: float | None = None
    tp2_price: float | None = None
    description: str | None = None
    order_type: Literal["limit", "market"] | None = None
    confidence: int | None = Field(default=None, ge=1, le=5)


class RenameModelRequest(BaseModel):
    name: str


class UpdateBatchRequest(BaseModel):
    market_analysis: str


class SubmitOrdersRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: str
    market_analysis: str = ""
    orders: list[OrderInput] = []


# --- Endpoints ---

@router.get("/model-names")
def list_model_names():
    """Return distinct model names for autocomplete."""
    with get_db() as conn:
        names = get_benchmark_model_names(conn)
    return {"names": names}


@router.get("/models")
def list_models():
    """Return all models with computed metrics (leaderboard)."""
    with get_db() as conn:
        models = get_all_benchmark_models(conn)
        result = []
        for m in models:
            metrics = _compute_metrics(conn, m)
            result.append(metrics)
    return {"models": result}


@router.get("/models/{model_id}")
def get_model_detail(model_id: str):
    """Return single model with computed metrics."""
    with get_db() as conn:
        m = get_benchmark_model(conn, model_id)
        if not m:
            raise HTTPException(404, "Model not found")
        return _compute_metrics(conn, m)


@router.get("/models/{model_id}/orders")
def get_orders(model_id: str):
    """Return all orders for a model."""
    with get_db() as conn:
        m = get_benchmark_model(conn, model_id)
        if not m:
            raise HTTPException(404, "Model not found")
        orders = get_model_orders(conn, model_id)
    return {"orders": orders}


@router.get("/models/{model_id}/batches")
def get_batches(model_id: str):
    """Return all batches (with market_analysis) for a model."""
    with get_db() as conn:
        m = get_benchmark_model(conn, model_id)
        if not m:
            raise HTTPException(404, "Model not found")
        batches = get_model_batches(conn, model_id)
    return {"batches": batches}


@router.patch("/models/{model_id}")
def rename_model(model_id: str, req: RenameModelRequest):
    """Rename a benchmark model."""
    new_name = req.name.strip()
    if not new_name:
        raise HTTPException(400, "모델 이름은 비어있을 수 없습니다")
    with get_db() as conn:
        m = get_benchmark_model(conn, model_id)
        if not m:
            raise HTTPException(404, "Model not found")
        # Check for duplicate name
        existing = conn.execute(
            "SELECT id FROM benchmark_models WHERE name=? AND id!=?",
            (new_name, model_id),
        ).fetchone()
        if existing:
            raise HTTPException(400, f"이미 '{new_name}' 이름의 모델이 존재합니다")
        rename_benchmark_model(conn, model_id, new_name)
    return {"ok": True}


@router.delete("/models/{model_id}")
def remove_model(model_id: str):
    """Delete a model and all its orders/batches."""
    with get_db() as conn:
        m = get_benchmark_model(conn, model_id)
        if not m:
            raise HTTPException(404, "Model not found")
        delete_benchmark_model(conn, model_id)
    return {"ok": True}


@router.patch("/orders/{order_id}")
def patch_order(order_id: int, req: UpdateOrderRequest):
    """Update editable fields on an order.

    PENDING orders: all fields editable.
    FILLED/CLOSED/CANCELLED: only description editable.
    """
    with get_db() as conn:
        order = get_benchmark_order(conn, order_id)
        if not order:
            raise HTTPException(404, "Order not found")

        updates: dict = {}
        is_pending = order["status"] == "PENDING"

        # description is always editable
        if req.description is not None:
            updates["description"] = req.description

        # Other fields only editable for PENDING orders
        if is_pending:
            price_fields = {}
            if req.symbol is not None:
                if req.symbol not in TOP_COINS:
                    raise HTTPException(400, f"Unknown symbol '{req.symbol}'")
                updates["symbol"] = req.symbol
            if req.side is not None:
                updates["side"] = req.side
            if req.order_type is not None:
                updates["order_type"] = req.order_type
            if req.confidence is not None:
                updates["confidence"] = req.confidence
            if req.entry_price is not None:
                updates["entry_price"] = req.entry_price
                price_fields["entry_price"] = req.entry_price
            if req.tp_price is not None:
                updates["tp_price"] = req.tp_price
                price_fields["tp_price"] = req.tp_price
            if req.sl_price is not None:
                updates["sl_price"] = req.sl_price
                price_fields["sl_price"] = req.sl_price
            if req.tp2_price is not None:
                updates["tp2_price"] = req.tp2_price

            # Validate price relationships if any price changed
            if price_fields:
                entry = price_fields.get("entry_price", order["entry_price"])
                tp = price_fields.get("tp_price", order["tp_price"])
                sl = price_fields.get("sl_price", order["sl_price"])
                side = updates.get("side", order["side"])
                if side == "long":
                    if tp <= entry:
                        raise HTTPException(400, "Long TP must be > entry price")
                    if sl >= entry:
                        raise HTTPException(400, "Long SL must be < entry price")
                else:
                    if tp >= entry:
                        raise HTTPException(400, "Short TP must be < entry price")
                    if sl <= entry:
                        raise HTTPException(400, "Short SL must be > entry price")
        elif req.model_dump(exclude_none=True).keys() - {"description"}:
            raise HTTPException(400, "Only description is editable for non-PENDING orders")

        if not updates:
            raise HTTPException(400, "No fields to update")

        update_benchmark_order(conn, order_id, updates)

    return {"ok": True}


@router.patch("/batches/{batch_id}")
def patch_batch(batch_id: str, req: UpdateBatchRequest):
    """Update market analysis on a batch."""
    with get_db() as conn:
        batch = get_benchmark_batch(conn, batch_id)
        if not batch:
            raise HTTPException(404, "Batch not found")
        update_benchmark_batch(conn, batch_id, {"market_analysis": req.market_analysis.strip()})
    return {"ok": True}


@router.delete("/batches/{batch_id}")
def remove_batch(batch_id: str):
    """Delete a batch: cancel PENDING orders, remove batch record.

    FILLED/CLOSED orders remain untouched (can't undo realized P&L).
    """
    with get_db() as conn:
        batch = get_benchmark_batch(conn, batch_id)
        if not batch:
            raise HTTPException(404, "Batch not found")

        cancelled_count = cancel_batch_pending_orders(conn, batch_id)
        delete_benchmark_batch(conn, batch_id)

    return {"ok": True, "cancelled_orders": cancelled_count}


@router.post("/orders")
def submit_orders(req: SubmitOrdersRequest):
    """Submit a batch of orders (and/or market analysis) for an AI model."""
    if not req.orders and not req.market_analysis.strip():
        raise HTTPException(400, "주문 또는 시장 분석이 필요합니다")

    # Validate each order
    for i, o in enumerate(req.orders):
        if o.entry_price <= 0 or o.tp_price <= 0 or o.sl_price <= 0:
            raise HTTPException(400, f"Order {i+1}: prices must be > 0")
        if o.symbol not in TOP_COINS:
            raise HTTPException(400, f"Order {i+1}: unknown symbol '{o.symbol}'")

        if o.side == "long":
            if o.tp_price <= o.entry_price:
                raise HTTPException(400, f"Order {i+1}: Long TP must be > entry price")
            if o.sl_price >= o.entry_price:
                raise HTTPException(400, f"Order {i+1}: Long SL must be < entry price")
            if o.tp2_price is not None and o.tp2_price <= o.tp_price:
                raise HTTPException(400, f"Order {i+1}: Long TP2 must be > TP1")
        else:
            if o.tp_price >= o.entry_price:
                raise HTTPException(400, f"Order {i+1}: Short TP must be < entry price")
            if o.sl_price <= o.entry_price:
                raise HTTPException(400, f"Order {i+1}: Short SL must be > entry price")
            if o.tp2_price is not None and o.tp2_price >= o.tp_price:
                raise HTTPException(400, f"Order {i+1}: Short TP2 must be < TP1")

    with get_db() as conn:
        model = get_or_create_model(conn, req.model_name, BENCHMARK_SEED, BENCHMARK_LEVERAGE)
        model_id = model["id"]
        batch_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc).isoformat()

        # Insert batch record (always — even analysis-only)
        insert_benchmark_batch(conn, {
            "id": batch_id,
            "model_id": model_id,
            "market_analysis": req.market_analysis.strip(),
            "created_at": now,
        })

        margin_per_order = 0.0
        if req.orders:
            # Calculate available balance
            active_margin = get_active_margin(conn, model_id)
            available = model["balance"] - active_margin
            if available <= 0:
                raise HTTPException(400, "Insufficient available balance (all funds in open positions)")

            margin_per_order = round(available / len(req.orders), 4)
            if margin_per_order <= 0:
                raise HTTPException(400, "Insufficient balance for this many orders")

            for o in req.orders:
                is_market = o.order_type == "market"
                insert_benchmark_order(conn, {
                    "model_id": model_id,
                    "batch_id": batch_id,
                    "symbol": o.symbol,
                    "side": o.side,
                    "entry_price": o.entry_price,
                    "tp_price": o.tp_price,
                    "sl_price": o.sl_price,
                    "description": o.description,
                    "margin": margin_per_order,
                    "status": "FILLED" if is_market else "PENDING",
                    "created_at": now,
                    "order_type": o.order_type,
                    "confidence": o.confidence,
                    "tp2_price": o.tp2_price,
                    "fill_time": now if is_market else None,
                })

    return {"model_id": model_id, "batch_id": batch_id, "margin_per_order": margin_per_order}


@router.get("/stream")
async def stream_events():
    """SSE endpoint for real-time order status changes."""
    q = subscribe()

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unsubscribe(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# --- Metrics computation ---

def _compute_metrics(conn, model: dict) -> dict:
    """Compute performance metrics for a benchmark model."""
    model_id = model["id"]
    all_orders = conn.execute(
        "SELECT * FROM benchmark_orders WHERE model_id=? ORDER BY created_at",
        (model_id,),
    ).fetchall()
    all_orders = [dict(r) for r in all_orders]

    closed = [o for o in all_orders if o["status"] == "CLOSED"]
    cancelled = [o for o in all_orders if o["status"] == "CANCELLED"]
    filled_or_closed = [o for o in all_orders if o["status"] in ("FILLED", "CLOSED")]

    wins = [o for o in closed if o["pnl"] is not None and o["pnl"] > 0]
    losses = [o for o in closed if o["pnl"] is not None and o["pnl"] <= 0]

    win_rate = (len(wins) / len(closed) * 100) if closed else 0

    gross_profit = sum(o["pnl"] for o in wins) if wins else 0
    gross_loss = abs(sum(o["pnl"] for o in losses)) if losses else 0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (float("inf") if gross_profit > 0 else 0)

    # MDD from balance_after series
    balances = [model["seed"]]
    for o in closed:
        if o["balance_after"] is not None:
            balances.append(o["balance_after"])
    peak = balances[0]
    mdd = 0.0
    for b in balances:
        if b > peak:
            peak = b
        dd = (peak - b) / peak * 100 if peak > 0 else 0
        if dd > mdd:
            mdd = dd

    # Average holding time (minutes)
    holding_times = []
    for o in closed:
        if o["fill_time"] and o["close_time"]:
            ft = datetime.fromisoformat(o["fill_time"])
            ct = datetime.fromisoformat(o["close_time"])
            holding_times.append((ct - ft).total_seconds() / 60)
    avg_holding = (sum(holding_times) / len(holding_times)) if holding_times else 0

    fill_rate = (len(filled_or_closed) / len(all_orders) * 100) if all_orders else 0
    cumulative_pnl = model["balance"] - model["seed"]

    # Active margin
    active_margin = get_active_margin(conn, model_id)

    return {
        "id": model["id"],
        "name": model["name"],
        "balance": model["balance"],
        "seed": model["seed"],
        "created_at": model["created_at"],
        "total_orders": len(all_orders),
        "closed_orders": len(closed),
        "cancelled_orders": len(cancelled),
        "win_rate": round(win_rate, 2),
        "mdd": round(mdd, 2),
        "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else None,
        "avg_holding_minutes": round(avg_holding, 1),
        "fill_rate": round(fill_rate, 2),
        "cumulative_pnl": round(cumulative_pnl, 4),
        "unrealized_pnl": 0.0,  # computed with live prices in monitor
        "active_margin": round(active_margin, 4),
        "available_balance": round(model["balance"] - active_margin, 4),
    }
