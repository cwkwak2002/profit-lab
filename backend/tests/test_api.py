"""API integration tests using FastAPI TestClient.

Tests the full pipeline: health → backtest run → summary → coins → trades.
Uses a temporary SQLite DB by patching data.db.get_connection.
"""
import sys
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


@pytest.fixture
def test_conn(tmp_path):
    """Create a test SQLite connection with schema."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript("""
        CREATE TABLE candles (
            symbol TEXT NOT NULL, timeframe TEXT NOT NULL,
            timestamp INTEGER NOT NULL, open REAL, high REAL, low REAL, close REAL, volume REAL,
            PRIMARY KEY (symbol, timeframe, timestamp)
        );
        CREATE TABLE backtest_runs (
            id TEXT PRIMARY KEY, created_at TEXT, start_date TEXT, end_date TEXT,
            coins TEXT, params TEXT
        );
        CREATE TABLE backtest_coin_summary (
            run_id TEXT, symbol TEXT, total_trades INTEGER DEFAULT 0,
            win_rate REAL DEFAULT 0, cumulative_return REAL DEFAULT 0,
            max_drawdown REAL DEFAULT 0, final_balance REAL DEFAULT 0,
            PRIMARY KEY (run_id, symbol)
        );
        CREATE TABLE trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, symbol TEXT,
            side TEXT NOT NULL DEFAULT 'long',
            entry_time TEXT, entry_price REAL, entry_margin REAL,
            exit_time TEXT, exit_price REAL, exit_reason TEXT,
            pnl REAL, pnl_pct REAL, balance_after REAL, tp1_time TEXT
        );
    """)
    conn.commit()
    yield conn, db_path
    conn.close()


def _make_connection_factory(db_path):
    """Return a function that creates connections to the test DB."""
    def factory():
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
    return factory


@pytest.fixture
def client(test_conn):
    """Create a TestClient that uses the test DB."""
    conn, db_path = test_conn
    factory = _make_connection_factory(db_path)
    with patch("data.db.get_connection", factory), \
         patch("routers.data.get_exchange", side_effect=RuntimeError("no exchange in tests")):
        yield TestClient(app)


def _seed_1m_candles(conn, symbol="BTC", hours=100):
    """Insert synthetic 1m candles into the test DB."""
    base_ts = 1_704_067_200_000  # 2024-01-01 00:00:00 UTC
    rows = []
    for i in range(hours * 60):
        ts = base_ts + i * 60_000
        hour = i // 60
        minute = i % 60

        if hour < 20:
            base = 100.0 - hour * 0.3
        elif hour < 40:
            base = 94.0 + (hour - 20) * 0.5
        elif hour < 55:
            base = 104.0 - (hour - 40) * 1.2
        elif hour < 65:
            base = 86.0 + (hour - 55) * 1.0
        elif hour < 80:
            base = 96.0 - (hour - 65) * 1.0
        else:
            base = 81.0 + (hour - 80) * 1.5

        price = base + (minute - 30) / 60
        rows.append((symbol, "1m", ts, price * 0.999, price * 1.002, price * 0.998, price, 100.0))

    conn.executemany("INSERT OR IGNORE INTO candles VALUES (?,?,?,?,?,?,?,?)", rows)
    conn.commit()


class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestCandlesEndpoint:
    def test_get_candles_empty(self, client):
        resp = client.get("/api/data/candles", params={
            "symbol": "BTC", "timeframe": "1h",
            "start_date": "2024-01-01", "end_date": "2024-01-02",
        })
        assert resp.status_code == 200
        assert resp.json()["candles"] == []

    def test_get_candles_invalid_timeframe(self, client):
        resp = client.get("/api/data/candles", params={
            "symbol": "BTC", "timeframe": "3h",
            "start_date": "2024-01-01", "end_date": "2024-01-02",
        })
        assert resp.status_code == 400

    def test_get_candles_with_data(self, client, test_conn):
        """Insert 1m candles, query resampled 1h candles."""
        conn, _ = test_conn
        _seed_1m_candles(conn, hours=3)
        resp = client.get("/api/data/candles", params={
            "symbol": "BTC", "timeframe": "1h",
            "start_date": "2024-01-01", "end_date": "2024-01-02",
        })
        assert resp.status_code == 200
        candles = resp.json()["candles"]
        assert len(candles) >= 1
        assert "rsi" in candles[0]

    def test_get_candles_1m_no_resample(self, client, test_conn):
        """1m timeframe should return raw data without resampling."""
        conn, _ = test_conn
        _seed_1m_candles(conn, hours=1)
        resp = client.get("/api/data/candles", params={
            "symbol": "BTC", "timeframe": "1m",
            "start_date": "2024-01-01", "end_date": "2024-01-02",
        })
        assert resp.status_code == 200
        candles = resp.json()["candles"]
        assert len(candles) == 60  # 1 hour = 60 1m candles


class TestBacktestEndpoints:
    def test_run_backtest(self, client, test_conn):
        conn, _ = test_conn
        _seed_1m_candles(conn)
        resp = client.post("/api/backtest/run", json={
            "coins": ["BTC"],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
        })
        assert resp.status_code == 200
        assert "run_id" in resp.json()

    def test_get_summary(self, client, test_conn):
        conn, _ = test_conn
        _seed_1m_candles(conn)
        run_id = client.post("/api/backtest/run", json={
            "coins": ["BTC"], "start_date": "2024-01-01", "end_date": "2024-01-05",
        }).json()["run_id"]

        resp = client.get(f"/api/backtest/{run_id}/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "run" in data
        assert "aggregate" in data
        assert "total_trades" in data["aggregate"]

    def test_get_summary_404(self, client):
        resp = client.get("/api/backtest/nonexistent/summary")
        assert resp.status_code == 404

    def test_get_coins(self, client, test_conn):
        conn, _ = test_conn
        _seed_1m_candles(conn)
        run_id = client.post("/api/backtest/run", json={
            "coins": ["BTC"], "start_date": "2024-01-01", "end_date": "2024-01-05",
        }).json()["run_id"]

        resp = client.get(f"/api/backtest/{run_id}/coins")
        assert resp.status_code == 200
        coins = resp.json()["coins"]
        assert len(coins) == 1
        assert coins[0]["symbol"] == "BTC"

    def test_get_coin_trades(self, client, test_conn):
        conn, _ = test_conn
        _seed_1m_candles(conn)
        run_id = client.post("/api/backtest/run", json={
            "coins": ["BTC"], "start_date": "2024-01-01", "end_date": "2024-01-05",
        }).json()["run_id"]

        resp = client.get(f"/api/backtest/{run_id}/coins/BTC/trades")
        assert resp.status_code == 200
        assert isinstance(resp.json()["trades"], list)

    def test_get_coin_trades_404(self, client):
        resp = client.get("/api/backtest/nonexistent/coins/BTC/trades")
        assert resp.status_code == 404

    def test_full_pipeline_consistency(self, client, test_conn):
        """Verify summary total_trades matches sum of coin trades."""
        conn, _ = test_conn
        _seed_1m_candles(conn)
        run_id = client.post("/api/backtest/run", json={
            "coins": ["BTC"], "start_date": "2024-01-01", "end_date": "2024-01-05",
        }).json()["run_id"]

        summary = client.get(f"/api/backtest/{run_id}/summary").json()
        coins = client.get(f"/api/backtest/{run_id}/coins").json()["coins"]
        trades = client.get(f"/api/backtest/{run_id}/coins/BTC/trades").json()["trades"]

        assert summary["aggregate"]["total_trades"] == sum(c["total_trades"] for c in coins)
        assert len(trades) == coins[0]["total_trades"]

    def test_empty_coin_data(self, client):
        """Backtest with no candle data → 0 trades, seed preserved."""
        resp = client.post("/api/backtest/run", json={
            "coins": ["NOCOIN"], "start_date": "2024-01-01", "end_date": "2024-01-05",
        })
        run_id = resp.json()["run_id"]
        coins = client.get(f"/api/backtest/{run_id}/coins").json()["coins"]
        assert coins[0]["total_trades"] == 0
        assert coins[0]["final_balance"] == 100.0
