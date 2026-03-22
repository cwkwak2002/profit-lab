import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager

from config import DB_PATH


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS candles (
                symbol TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                volume REAL NOT NULL,
                PRIMARY KEY (symbol, timeframe, timestamp)
            );

            CREATE INDEX IF NOT EXISTS idx_candles_symbol_tf
                ON candles(symbol, timeframe, timestamp);

            CREATE TABLE IF NOT EXISTS backtest_runs (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                coins TEXT NOT NULL,
                params TEXT
            );

            CREATE TABLE IF NOT EXISTS backtest_coin_summary (
                run_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                total_trades INTEGER NOT NULL DEFAULT 0,
                win_rate REAL NOT NULL DEFAULT 0,
                cumulative_return REAL NOT NULL DEFAULT 0,
                max_drawdown REAL NOT NULL DEFAULT 0,
                final_balance REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (run_id, symbol),
                FOREIGN KEY (run_id) REFERENCES backtest_runs(id)
            );

            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL DEFAULT 'long',
                entry_time TEXT NOT NULL,
                entry_price REAL NOT NULL,
                entry_margin REAL NOT NULL,
                exit_time TEXT NOT NULL,
                exit_price REAL NOT NULL,
                exit_reason TEXT NOT NULL,
                pnl REAL NOT NULL,
                pnl_pct REAL NOT NULL,
                balance_after REAL NOT NULL,
                tp1_time TEXT,
                FOREIGN KEY (run_id) REFERENCES backtest_runs(id)
            );

            CREATE INDEX IF NOT EXISTS idx_trades_run_symbol
                ON trades(run_id, symbol, entry_time);

            -- AI Benchmark tables
            CREATE TABLE IF NOT EXISTS benchmark_models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                seed REAL NOT NULL DEFAULT 100.0,
                leverage INTEGER NOT NULL DEFAULT 10,
                created_at TEXT NOT NULL,
                balance REAL NOT NULL DEFAULT 100.0
            );
            CREATE INDEX IF NOT EXISTS idx_bm_name ON benchmark_models(name);

            CREATE TABLE IF NOT EXISTS benchmark_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id TEXT NOT NULL,
                batch_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                entry_price REAL NOT NULL,
                tp_price REAL NOT NULL,
                sl_price REAL NOT NULL,
                description TEXT DEFAULT '',
                margin REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                created_at TEXT NOT NULL,
                fill_time TEXT,
                close_time TEXT,
                close_price REAL,
                close_reason TEXT,
                pnl REAL,
                pnl_pct REAL,
                balance_after REAL,
                order_type TEXT NOT NULL DEFAULT 'limit',
                confidence INTEGER NOT NULL DEFAULT 3,
                tp2_price REAL,
                tp1_hit INTEGER NOT NULL DEFAULT 0,
                tp1_pnl REAL,
                FOREIGN KEY (model_id) REFERENCES benchmark_models(id)
            );
            CREATE INDEX IF NOT EXISTS idx_bo_model_status
                ON benchmark_orders(model_id, status);
            CREATE INDEX IF NOT EXISTS idx_bo_batch
                ON benchmark_orders(batch_id);

            CREATE TABLE IF NOT EXISTS benchmark_batches (
                id TEXT PRIMARY KEY,
                model_id TEXT NOT NULL,
                market_analysis TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (model_id) REFERENCES benchmark_models(id)
            );
            CREATE INDEX IF NOT EXISTS idx_bb_model ON benchmark_batches(model_id);
        """)

        # Migration: add new columns to existing benchmark_orders table
        for col_sql in [
            "ALTER TABLE benchmark_orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'limit'",
            "ALTER TABLE benchmark_orders ADD COLUMN confidence INTEGER NOT NULL DEFAULT 3",
            "ALTER TABLE benchmark_orders ADD COLUMN tp2_price REAL",
            "ALTER TABLE benchmark_orders ADD COLUMN tp1_hit INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE benchmark_orders ADD COLUMN tp1_pnl REAL",
        ]:
            try:
                conn.execute(col_sql)
            except sqlite3.OperationalError:
                pass  # column already exists


# --- Query helpers ---

def save_candles(conn: sqlite3.Connection, symbol: str, timeframe: str, candles: list[list]):
    conn.executemany(
        """INSERT OR IGNORE INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [(symbol, timeframe, int(c[0]), c[1], c[2], c[3], c[4], c[5]) for c in candles],
    )


def get_candles(conn: sqlite3.Connection, symbol: str, timeframe: str,
                start_ts: int, end_ts: int) -> list[dict]:
    rows = conn.execute(
        """SELECT timestamp, open, high, low, close, volume FROM candles
           WHERE symbol=? AND timeframe=? AND timestamp>=? AND timestamp<=?
           ORDER BY timestamp""",
        (symbol, timeframe, start_ts, end_ts),
    ).fetchall()
    return [dict(r) for r in rows]


def save_backtest_run(conn: sqlite3.Connection, run_id: str, created_at: str,
                      start_date: str, end_date: str, coins: list[str], params: dict):
    conn.execute(
        "INSERT INTO backtest_runs (id, created_at, start_date, end_date, coins, params) VALUES (?,?,?,?,?,?)",
        (run_id, created_at, start_date, end_date, json.dumps(coins), json.dumps(params)),
    )


def save_coin_summary(conn: sqlite3.Connection, run_id: str, symbol: str,
                      total_trades: int, win_rate: float, cumulative_return: float,
                      max_drawdown: float, final_balance: float):
    conn.execute(
        """INSERT INTO backtest_coin_summary
           (run_id, symbol, total_trades, win_rate, cumulative_return, max_drawdown, final_balance)
           VALUES (?,?,?,?,?,?,?)""",
        (run_id, symbol, total_trades, win_rate, cumulative_return, max_drawdown, final_balance),
    )


def save_trades(conn: sqlite3.Connection, trades_list: list[dict]):
    conn.executemany(
        """INSERT INTO trades
           (run_id, symbol, side, entry_time, entry_price, entry_margin, exit_time, exit_price,
            exit_reason, pnl, pnl_pct, balance_after, tp1_time)
           VALUES (:run_id, :symbol, :side, :entry_time, :entry_price, :entry_margin, :exit_time,
                   :exit_price, :exit_reason, :pnl, :pnl_pct, :balance_after, :tp1_time)""",
        trades_list,
    )


def get_backtest_run(conn: sqlite3.Connection, run_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM backtest_runs WHERE id=?", (run_id,)).fetchone()
    if row:
        d = dict(row)
        d["coins"] = json.loads(d["coins"])
        d["params"] = json.loads(d["params"]) if d["params"] else {}
        return d
    return None


def get_coin_summaries(conn: sqlite3.Connection, run_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM backtest_coin_summary WHERE run_id=? ORDER BY cumulative_return DESC",
        (run_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_trades_for_coin(conn: sqlite3.Connection, run_id: str, symbol: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM trades WHERE run_id=? AND symbol=? ORDER BY entry_time",
        (run_id, symbol),
    ).fetchall()
    return [dict(r) for r in rows]


# --- Benchmark helpers ---

def get_or_create_model(conn: sqlite3.Connection, name: str, seed: float, leverage: int) -> dict:
    row = conn.execute("SELECT * FROM benchmark_models WHERE name=?", (name,)).fetchone()
    if row:
        return dict(row)
    import uuid
    from datetime import datetime, timezone
    model_id = str(uuid.uuid4())[:8]
    created = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO benchmark_models (id, name, seed, leverage, created_at, balance) VALUES (?,?,?,?,?,?)",
        (model_id, name, seed, leverage, created, seed),
    )
    return {"id": model_id, "name": name, "seed": seed, "leverage": leverage,
            "created_at": created, "balance": seed}


def get_benchmark_model(conn: sqlite3.Connection, model_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM benchmark_models WHERE id=?", (model_id,)).fetchone()
    return dict(row) if row else None


def get_all_benchmark_models(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM benchmark_models ORDER BY created_at").fetchall()
    return [dict(r) for r in rows]


def get_benchmark_model_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT DISTINCT name FROM benchmark_models ORDER BY name").fetchall()
    return [r["name"] for r in rows]


def get_active_margin(conn: sqlite3.Connection, model_id: str) -> float:
    row = conn.execute(
        "SELECT COALESCE(SUM(margin), 0) as total FROM benchmark_orders WHERE model_id=? AND status IN ('PENDING', 'FILLED')",
        (model_id,),
    ).fetchone()
    return row["total"]


def insert_benchmark_order(conn: sqlite3.Connection, order: dict):
    conn.execute(
        """INSERT INTO benchmark_orders
           (model_id, batch_id, symbol, side, entry_price, tp_price, sl_price,
            description, margin, status, created_at, order_type, confidence,
            tp2_price, fill_time)
           VALUES (:model_id, :batch_id, :symbol, :side, :entry_price, :tp_price, :sl_price,
                   :description, :margin, :status, :created_at, :order_type, :confidence,
                   :tp2_price, :fill_time)""",
        order,
    )


def insert_benchmark_batch(conn: sqlite3.Connection, batch: dict):
    conn.execute(
        """INSERT INTO benchmark_batches (id, model_id, market_analysis, created_at)
           VALUES (:id, :model_id, :market_analysis, :created_at)""",
        batch,
    )


def get_model_batches(conn: sqlite3.Connection, model_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM benchmark_batches WHERE model_id=? ORDER BY created_at DESC",
        (model_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_model_orders(conn: sqlite3.Connection, model_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM benchmark_orders WHERE model_id=? ORDER BY created_at DESC",
        (model_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_active_orders(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM benchmark_orders WHERE status IN ('PENDING', 'FILLED')"
    ).fetchall()
    return [dict(r) for r in rows]


def get_benchmark_order(conn: sqlite3.Connection, order_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM benchmark_orders WHERE id=?", (order_id,)).fetchone()
    return dict(row) if row else None


def get_benchmark_batch(conn: sqlite3.Connection, batch_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM benchmark_batches WHERE id=?", (batch_id,)).fetchone()
    return dict(row) if row else None


def update_benchmark_order(conn: sqlite3.Connection, order_id: int, updates: dict):
    """Update specified fields on a benchmark order."""
    if not updates:
        return
    set_clause = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values()) + [order_id]
    conn.execute(f"UPDATE benchmark_orders SET {set_clause} WHERE id=?", values)


def update_benchmark_batch(conn: sqlite3.Connection, batch_id: str, updates: dict):
    """Update specified fields on a benchmark batch."""
    if not updates:
        return
    set_clause = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values()) + [batch_id]
    conn.execute(f"UPDATE benchmark_batches SET {set_clause} WHERE id=?", values)


def cancel_batch_pending_orders(conn: sqlite3.Connection, batch_id: str) -> int:
    """Cancel all PENDING orders in a batch. Returns count of cancelled orders."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(
        """UPDATE benchmark_orders SET status='CANCELLED', close_time=?, close_reason='MANUAL'
           WHERE batch_id=? AND status='PENDING'""",
        (now, batch_id),
    )
    return cursor.rowcount


def delete_benchmark_batch(conn: sqlite3.Connection, batch_id: str):
    """Delete a batch record (orders are NOT deleted, just the batch metadata)."""
    conn.execute("DELETE FROM benchmark_batches WHERE id=?", (batch_id,))


def rename_benchmark_model(conn: sqlite3.Connection, model_id: str, new_name: str):
    """Rename a benchmark model."""
    conn.execute("UPDATE benchmark_models SET name=? WHERE id=?", (new_name, model_id))


def delete_benchmark_model(conn: sqlite3.Connection, model_id: str):
    """Delete a model and all its orders and batches."""
    conn.execute("DELETE FROM benchmark_orders WHERE model_id=?", (model_id,))
    conn.execute("DELETE FROM benchmark_batches WHERE model_id=?", (model_id,))
    conn.execute("DELETE FROM benchmark_models WHERE id=?", (model_id,))
