import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

# .env.local overrides .env (local dev uses .env.local, Docker uses .env)
_root = Path(__file__).parent.parent
load_dotenv(_root / ".env.local", override=True)
load_dotenv(_root / ".env")

import os
_ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
if _ca:
    _ca = os.path.expanduser(_ca)
    if os.path.exists(_ca):
        # Build combined CA bundle: certifi standard CAs + custom CA (e.g. Cloudflare WARP)
        # httpx requires ALL trusted CAs in one bundle — custom CA alone is not enough
        import certifi, tempfile
        _combined = tempfile.NamedTemporaryFile(delete=False, suffix=".pem", prefix="combined_ca_")
        _combined.write(open(certifi.where(), "rb").read())
        _combined.write(open(_ca, "rb").read())
        _combined.flush()
        _combined_path = _combined.name
        _combined.close()

        # 1) env vars (requests reads REQUESTS_CA_BUNDLE at request time)
        os.environ["SSL_CERT_FILE"] = _combined_path
        os.environ["REQUESTS_CA_BUNDLE"] = _combined_path

        # 2) certifi patch (httpx uses certifi.where() to find default CA)
        certifi.where = lambda: _combined_path  # type: ignore[assignment]

        # 3) requests DEFAULT_CA_BUNDLE_PATH (set at import time, must patch directly)
        try:
            import requests.utils, requests.adapters
            requests.utils.DEFAULT_CA_BUNDLE_PATH = _combined_path
            requests.adapters.DEFAULT_CA_BUNDLE_PATH = _combined_path
        except ImportError:
            pass

        # 4) ssl default context (for urllib3 and other stdlib users)
        import ssl
        _orig_create = ssl.create_default_context
        def _patched_create(*args, **kwargs):  # type: ignore[misc]
            kwargs.setdefault("cafile", _combined_path)
            return _orig_create(*args, **kwargs)
        ssl.create_default_context = _patched_create  # type: ignore[assignment]

        logging.getLogger(__name__).info("SSL CA patched (combined bundle): %s + %s", certifi.where(), _ca)
    else:
        logging.getLogger(__name__).warning("SSL CA file not found: %s", _ca)

from fastapi.middleware.cors import CORSMiddleware

from data.db import init_db
from routers.data import router as data_router
from routers.backtest import router as backtest_router
from routers.benchmark import router as benchmark_router
from engine.benchmark_monitor import monitor_loop
from engine.ai_trader import ai_trader_loop
from engine.telegram_listener import telegram_listener_loop


@asynccontextmanager
async def lifespan(app):
    init_db()
    monitor_task = asyncio.create_task(monitor_loop())
    trader_task = asyncio.create_task(ai_trader_loop())
    telegram_task = asyncio.create_task(telegram_listener_loop())
    yield
    monitor_task.cancel()
    trader_task.cancel()
    telegram_task.cancel()
    for t in (monitor_task, trader_task, telegram_task):
        try:
            await t
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Profit Lab", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_router)
app.include_router(backtest_router)
app.include_router(benchmark_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


