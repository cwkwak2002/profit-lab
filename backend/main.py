import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data.db import init_db
from routers.data import router as data_router
from routers.backtest import router as backtest_router
from routers.benchmark import router as benchmark_router
from engine.benchmark_monitor import monitor_loop


@asynccontextmanager
async def lifespan(app):
    init_db()
    task = asyncio.create_task(monitor_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Profit Lab", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
