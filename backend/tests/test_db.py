"""Tests for database operations."""
import sys
import json
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.db import (
    save_candles, get_candles,
    save_backtest_run, get_backtest_run,
    save_coin_summary, get_coin_summaries,
    save_trades, get_trades_for_coin,
)


class TestCandleOperations:
    def test_save_and_get_candles(self, in_memory_db):
        candles = [
            [1000, 10.0, 11.0, 9.0, 10.5, 100.0],
            [2000, 10.5, 12.0, 10.0, 11.0, 200.0],
            [3000, 11.0, 11.5, 10.5, 11.2, 150.0],
        ]
        save_candles(in_memory_db, "BTC", "1m", candles)
        result = get_candles(in_memory_db, "BTC", "1m", 0, 5000)
        assert len(result) == 3
        assert result[0]["timestamp"] == 1000
        assert result[0]["open"] == 10.0

    def test_get_candles_filters_by_range(self, in_memory_db):
        candles = [[i * 1000, 10.0, 11.0, 9.0, 10.0, 100.0] for i in range(10)]
        save_candles(in_memory_db, "ETH", "1m", candles)
        result = get_candles(in_memory_db, "ETH", "1m", 3000, 6000)
        assert len(result) == 4  # ts 3000, 4000, 5000, 6000

    def test_get_candles_filters_by_symbol(self, in_memory_db):
        save_candles(in_memory_db, "BTC", "1m", [[1000, 1, 2, 0, 1, 10]])
        save_candles(in_memory_db, "ETH", "1m", [[1000, 5, 6, 4, 5, 20]])
        btc = get_candles(in_memory_db, "BTC", "1m", 0, 5000)
        eth = get_candles(in_memory_db, "ETH", "1m", 0, 5000)
        assert len(btc) == 1
        assert btc[0]["open"] == 1
        assert len(eth) == 1
        assert eth[0]["open"] == 5

    def test_duplicate_candles_ignored(self, in_memory_db):
        """INSERT OR IGNORE should skip duplicates."""
        candles = [[1000, 10.0, 11.0, 9.0, 10.5, 100.0]]
        save_candles(in_memory_db, "BTC", "1m", candles)
        save_candles(in_memory_db, "BTC", "1m", candles)  # duplicate
        result = get_candles(in_memory_db, "BTC", "1m", 0, 5000)
        assert len(result) == 1

    def test_empty_result(self, in_memory_db):
        result = get_candles(in_memory_db, "BTC", "1m", 0, 5000)
        assert result == []


class TestBacktestRunOperations:
    def test_save_and_get_run(self, in_memory_db):
        save_backtest_run(
            in_memory_db, "run1", "2024-01-01T00:00:00",
            "2024-01-01", "2024-03-01", ["BTC", "ETH"], {"seed": 100, "leverage": 10},
        )
        run = get_backtest_run(in_memory_db, "run1")
        assert run is not None
        assert run["id"] == "run1"
        assert run["coins"] == ["BTC", "ETH"]
        assert run["params"]["seed"] == 100

    def test_get_nonexistent_run(self, in_memory_db):
        run = get_backtest_run(in_memory_db, "nonexistent")
        assert run is None


class TestCoinSummaryOperations:
    def test_save_and_get_summaries(self, in_memory_db):
        save_backtest_run(
            in_memory_db, "run1", "2024-01-01T00:00:00",
            "2024-01-01", "2024-03-01", ["BTC"], {},
        )
        save_coin_summary(in_memory_db, "run1", "BTC", 10, 60.0, 25.5, 8.3, 125.5)
        save_coin_summary(in_memory_db, "run1", "ETH", 5, 40.0, -10.0, 15.0, 90.0)

        summaries = get_coin_summaries(in_memory_db, "run1")
        assert len(summaries) == 2
        # Ordered by cumulative_return DESC
        assert summaries[0]["symbol"] == "BTC"
        assert summaries[1]["symbol"] == "ETH"

    def test_empty_summaries(self, in_memory_db):
        summaries = get_coin_summaries(in_memory_db, "nonexistent")
        assert summaries == []


class TestTradeOperations:
    def test_save_and_get_trades(self, in_memory_db):
        save_backtest_run(
            in_memory_db, "run1", "2024-01-01T00:00:00",
            "2024-01-01", "2024-03-01", ["BTC"], {},
        )
        trades = [
            {
                "run_id": "run1", "symbol": "BTC", "side": "long",
                "entry_time": "2024-01-05 10:00:00", "entry_price": 42000.0,
                "entry_margin": 100.0, "exit_time": "2024-01-05 14:00:00",
                "exit_price": 42840.0, "exit_reason": "TP1",
                "pnl": 20.0, "pnl_pct": 20.0, "balance_after": 120.0,
                "tp1_time": "2024-01-05 12:00:00",
            },
            {
                "run_id": "run1", "symbol": "BTC", "side": "long",
                "entry_time": "2024-01-06 10:00:00", "entry_price": 43000.0,
                "entry_margin": 120.0, "exit_time": "2024-01-06 12:00:00",
                "exit_price": 42500.0, "exit_reason": "SL",
                "pnl": -15.0, "pnl_pct": -12.5, "balance_after": 105.0,
                "tp1_time": None,
            },
        ]
        save_trades(in_memory_db, trades)
        result = get_trades_for_coin(in_memory_db, "run1", "BTC")
        assert len(result) == 2
        # Ordered by entry_time
        assert result[0]["entry_price"] == 42000.0
        assert result[1]["exit_reason"] == "SL"

    def test_get_trades_filters_by_symbol(self, in_memory_db):
        save_backtest_run(
            in_memory_db, "run1", "2024-01-01T00:00:00",
            "2024-01-01", "2024-03-01", ["BTC", "ETH"], {},
        )
        trades = [
            {
                "run_id": "run1", "symbol": "BTC", "side": "long",
                "entry_time": "2024-01-05 10:00:00", "entry_price": 42000.0,
                "entry_margin": 100.0, "exit_time": "2024-01-05 14:00:00",
                "exit_price": 42840.0, "exit_reason": "TP1",
                "pnl": 20.0, "pnl_pct": 20.0, "balance_after": 120.0,
                "tp1_time": None,
            },
            {
                "run_id": "run1", "symbol": "ETH", "side": "long",
                "entry_time": "2024-01-05 10:00:00", "entry_price": 2200.0,
                "entry_margin": 100.0, "exit_time": "2024-01-05 14:00:00",
                "exit_price": 2150.0, "exit_reason": "SL",
                "pnl": -10.0, "pnl_pct": -10.0, "balance_after": 90.0,
                "tp1_time": None,
            },
        ]
        save_trades(in_memory_db, trades)
        btc_trades = get_trades_for_coin(in_memory_db, "run1", "BTC")
        eth_trades = get_trades_for_coin(in_memory_db, "run1", "ETH")
        assert len(btc_trades) == 1
        assert len(eth_trades) == 1
        assert btc_trades[0]["symbol"] == "BTC"

    def test_empty_trades(self, in_memory_db):
        result = get_trades_for_coin(in_memory_db, "run1", "BTC")
        assert result == []
