"""Automated AI trader: fetches Bybit Futures market data, asks Claude for
recommendations, and submits orders to the benchmark system every 5 minutes."""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import anthropic

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

# ── Config ──────────────────────────────────────────────────────────────────

MODEL_NAME = "Claude Sonnet 4 (Calico)"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
INTERVAL_SEC = 300  # 5 minutes
TARGET_COIN_COUNT = 30

LOG_DIR = Path(__file__).parent.parent.parent / "data" / "ai_trader_logs"

SYSTEM_PROMPT = (
    "당신은 암호화폐 단기 트레이딩 추천 전문가입니다.\n"
    "Bybit Futures 마켓 데이터를 분석하여 단기(1시간~12시간) 트레이딩에 적합한 코인 3~5개를 추천합니다.\n\n"
    "규칙:\n"
    "- 반드시 JSON 배열 형식으로만 응답\n"
    "- 각 추천에 coin, direction, entry, tp, sl, confidence, reason 필드 포함\n"
    '- direction은 "LONG" 또는 "SHORT"\n'
    "- entry는 제안하는 진입가 (현재가와 다를 수 있음 — 지지/저항 기반으로 유리한 진입 지점 제시)\n"
    "- tp, sl은 구체적인 가격 숫자 (달러 기호 없이)\n"
    '- confidence는 "high", "medium", "low" 중 하나\n'
    "- reason은 한국어로 1~2문장, 추천 근거 요약\n"
    "- 거래량이 충분하고 변동성이 있는 코인 우선\n"
    "- 펀딩 레이트, OI 변화, 24h 변동률 등을 종합 고려\n"
    "- 불필요한 인사말, 서론, 결론 없이 JSON 배열만 출력"
)

CONFIDENCE_MAP = {"high": 5, "medium": 3, "low": 1}


# ── Bybit Futures data ────────────────────────────────────────────────────

def _fetch_bybit_data() -> list[dict]:
    """Fetch ticker + funding rate data for TOP_COINS from Bybit Futures.

    Runs synchronously (called via asyncio.to_thread).
    """
    exchange = get_exchange()
    pairs = [symbol_to_pair(c) for c in TOP_COINS]

    # Batch-fetch tickers (price, volume, 24h change)
    tickers = exchange.fetch_tickers(pairs)

    # Fetch funding rates
    funding_map: dict[str, float] = {}
    try:
        for pair in pairs:
            fr = exchange.fetch_funding_rate(pair)
            if fr and fr.get("fundingRate") is not None:
                funding_map[pair] = fr["fundingRate"]
    except Exception:
        logger.debug("Funding rate fetch failed — continuing without it")

    result = []
    for coin in TOP_COINS:
        pair = symbol_to_pair(coin)
        t = tickers.get(pair)
        if not t or not t.get("last"):
            continue
        price = t["last"]
        change_pct = t.get("percentage", 0) or 0
        volume_usd = t.get("quoteVolume", 0) or 0
        funding = funding_map.get(pair, 0)
        result.append({
            "coin": coin,
            "price": price,
            "change_24h": change_pct,
            "volume_24h": volume_usd,
            "funding_rate": funding * 100,  # to percentage
        })

    # Sort by volume descending, take top N
    result.sort(key=lambda x: x["volume_24h"], reverse=True)
    return result[:TARGET_COIN_COUNT]


# ── Prompt building ─────────────────────────────────────────────────────────

def _build_user_prompt(coins: list[dict], now_iso: str) -> str:
    lines = [
        f"요청 시각: {now_iso}\n",
        f"현재 Bybit Futures 마켓 데이터 (대상 코인 {len(coins)}개):\n",
        "코인 | 현재가 | 24h변동률 | 24h거래량(M USD) | 펀딩레이트(%)",
    ]
    for d in coins:
        vol_m = d["volume_24h"] / 1_000_000
        lines.append(
            f"{d['coin']} | {d['price']} | {d['change_24h']:.2f}% "
            f"| {vol_m:.1f}M | {d['funding_rate']:.4f}%"
        )
    coin_names = ", ".join(d["coin"] for d in coins)
    lines.append(
        f"\n위 {len(coins)}개 코인 중에서 단기 트레이딩에 적합한 코인 3~5개를 추천해주세요.\n"
        f"반드시 다음 코인명 중에서만 선택: {coin_names}\n"
        "다음 JSON 배열 형식으로 응답해주세요:\n"
        '[\n  {\n    "coin": "위 목록의 정확한 코인명",\n'
        '    "direction": "LONG 또는 SHORT",\n'
        '    "entry": 진입가(숫자),\n'
        '    "tp": 목표가(숫자),\n    "sl": 손절가(숫자),\n'
        '    "confidence": "high/medium/low",\n'
        '    "reason": "추천 근거 1~2문장"\n  }\n]'
    )
    return "\n".join(lines)


# ── Claude API ──────────────────────────────────────────────────────────────

def _call_claude(user_prompt: str) -> tuple[str, list[dict]]:
    """Synchronous call to Claude — run via asyncio.to_thread.

    Returns (raw_response_text, parsed_recommendations).
    """
    import httpx, os as _os
    ca = _os.environ.get("SSL_CERT_FILE") or _os.environ.get("REQUESTS_CA_BUNDLE")
    if ca:
        ca = _os.path.expanduser(ca)
    http_client = httpx.Client(verify=ca) if ca and _os.path.exists(ca) else None
    client = anthropic.Anthropic(http_client=http_client) if http_client else anthropic.Anthropic()
    resp = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    raw_text = resp.content[0].text
    text = raw_text

    # Strip markdown code fences if present
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    recs = json.loads(text)
    if not isinstance(recs, list):
        raise ValueError("Claude response is not a JSON array")
    return raw_text, recs


# ── Logging to file ─────────────────────────────────────────────────────────

def _save_log(now_iso: str, user_prompt: str, raw_response: str, recommendations: list[dict]):
    """Save prompt and response to a timestamped JSON file for debugging."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ts = now_iso.replace(":", "").replace("-", "").replace("T", "_").split(".")[0]
    filepath = LOG_DIR / f"{ts}.json"
    data = {
        "timestamp": now_iso,
        "model": CLAUDE_MODEL,
        "system_prompt": SYSTEM_PROMPT,
        "user_prompt": user_prompt,
        "raw_response": raw_response,
        "parsed_recommendations": recommendations,
    }
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Saved AI trader log: %s", filepath)


# ── Order submission ────────────────────────────────────────────────────────

def _submit_orders(
    recommendations: list[dict],
    coin_data: dict[str, dict],
    market_analysis: str,
):
    """Validate recommendations and insert benchmark orders."""
    orders = []
    valid_coins = {d["coin"] for d in coin_data.values()}

    for rec in recommendations:
        coin = rec.get("coin", "")
        if coin not in valid_coins:
            logger.warning("Skipping unknown coin from Claude: %s", coin)
            continue
        side = "long" if rec.get("direction", "").upper() == "LONG" else "short"
        entry = float(rec.get("entry", 0))
        tp = float(rec["tp"])
        sl = float(rec["sl"])
        confidence = CONFIDENCE_MAP.get(rec.get("confidence", "medium"), 3)
        reason = rec.get("reason", "")

        # Fallback: if Claude omitted entry, use current price
        if entry <= 0:
            info = coin_data[coin]
            entry = info["price"]

        # Basic validation (same as router)
        if side == "long":
            if tp <= entry or sl >= entry:
                logger.warning("Skipping invalid long %s: entry=%s tp=%s sl=%s", coin, entry, tp, sl)
                continue
        else:
            if tp >= entry or sl <= entry:
                logger.warning("Skipping invalid short %s: entry=%s tp=%s sl=%s", coin, entry, tp, sl)
                continue

        orders.append({
            "symbol": coin,
            "side": side,
            "entry_price": entry,
            "tp_price": tp,
            "sl_price": sl,
            "confidence": confidence,
            "description": reason,
        })

    if not orders:
        logger.info("No valid orders to submit after validation")
        return

    now = datetime.now(timezone.utc).isoformat()
    batch_id = str(uuid.uuid4())[:8]

    with get_db() as conn:
        model = get_or_create_model(conn, MODEL_NAME, BENCHMARK_SEED, BENCHMARK_LEVERAGE)
        model_id = model["id"]

        insert_benchmark_batch(conn, {
            "id": batch_id,
            "model_id": model_id,
            "market_analysis": market_analysis,
            "created_at": now,
        })

        active_margin = get_active_margin(conn, model_id)
        available = model["balance"] - active_margin
        if available < 1.0:
            logger.warning("Available balance $%.4f < $1 for %s — skipping", available, MODEL_NAME)
            return

        margin_per_order = round(available / len(orders), 4)
        if margin_per_order <= 0:
            logger.warning("Margin per order is 0 — skipping")
            return

        for o in orders:
            insert_benchmark_order(conn, {
                "model_id": model_id,
                "batch_id": batch_id,
                "symbol": o["symbol"],
                "side": o["side"],
                "entry_price": o["entry_price"],
                "tp_price": o["tp_price"],
                "sl_price": o["sl_price"],
                "description": o["description"],
                "margin": margin_per_order,
                "status": "PENDING",
                "created_at": now,
                "order_type": "limit",
                "confidence": o["confidence"],
                "tp2_price": None,
                "fill_time": None,
                "source": "ai_trader",
            })

    logger.info(
        "Submitted %d orders for %s (batch=%s, margin_each=%.4f)",
        len(orders), MODEL_NAME, batch_id, margin_per_order,
    )


# ── Main loop ───────────────────────────────────────────────────────────────

async def _run_once():
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Fetch Bybit Futures market data
    our_coins = await asyncio.to_thread(_fetch_bybit_data)
    if not our_coins:
        logger.warning("No market data from Bybit — skipping")
        return

    # Build lookup by coin name
    coin_lookup = {d["coin"]: d for d in our_coins}

    # 2. Build prompt and call Claude
    user_prompt = _build_user_prompt(our_coins, now_iso)
    logger.info("[%s] Calling Claude for %d coins…", now_iso, len(our_coins))
    raw_response, recommendations = await asyncio.to_thread(_call_claude, user_prompt)
    logger.info("Claude recommended %d trades", len(recommendations))

    # 3. Save prompt + response log
    _save_log(now_iso, user_prompt, raw_response, recommendations)

    # 4. Build market analysis text (for batch record)
    analysis_lines = []
    for rec in recommendations:
        coin = rec.get("coin", "?")
        direction = rec.get("direction", "?")
        reason = rec.get("reason", "")
        analysis_lines.append(f"[{coin} {direction}] {reason}")
    market_analysis = "\n".join(analysis_lines)

    # 5. Submit orders
    _submit_orders(recommendations, coin_lookup, market_analysis)


async def ai_trader_loop():
    """Background task: run AI trading every INTERVAL_SEC seconds."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — AI trader disabled")
        return

    logger.info("AI trader started (model=%s, interval=%ds)", MODEL_NAME, INTERVAL_SEC)
    await asyncio.sleep(15)  # let other startup tasks finish

    while True:
        try:
            await _run_once()
        except Exception:
            logger.exception("AI trader error")

        await asyncio.sleep(INTERVAL_SEC)
