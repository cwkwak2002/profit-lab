from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data.db import init_db
from routers.data import router as data_router
from routers.backtest import router as backtest_router

app = FastAPI(title="Profit Lab", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_router)
app.include_router(backtest_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
