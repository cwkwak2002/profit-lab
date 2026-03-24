import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

load_dotenv(Path(__file__).parent.parent / ".env")
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
