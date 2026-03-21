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
        """)


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
