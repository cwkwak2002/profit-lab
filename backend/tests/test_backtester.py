"""Tests for the backtest engine."""
import sys
from pathlib import Path

import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.backtester import run_backtest_for_coin, _ms_to_iso
from helpers import make_1h_candles, make_1m_candles, make_divergence_scenario


class TestMsToIso:
    def test_known_timestamp(self):
        # 2023-11-14 22:13:20 UTC = 1700000000 seconds = 1700000000000 ms
        result = _ms_to_iso(1_700_000_000_000)
        assert result == "2023-11-14 22:13:20"

    def test_zero(self):
        result = _ms_to_iso(0)
        assert result == "1970-01-01 00:00:00"


class TestRunBacktestForCoin:
    def test_no_signals_returns_empty(self):
        """Flat market → no trades."""
        prices = [100.0] * 80
        df_1h = make_1h_candles(80, prices=prices)
        df_1m = make_1m_candles(80 * 60, prices=[100.0] * (80 * 60))
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        assert result["trades"] == []
        assert result["summary"]["total_trades"] == 0
        assert result["summary"]["final_balance"] == 100.0

    def test_summary_fields_present(self):
        """Summary should have all required fields."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        summary = result["summary"]
        required = {"symbol", "total_trades", "win_rate", "cumulative_return", "max_drawdown", "final_balance"}
        assert required.issubset(summary.keys())

    def test_trade_record_fields(self):
        """Each trade should have all required fields."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        required = {
            "symbol", "entry_time", "entry_price", "entry_margin",
            "exit_time", "exit_price", "exit_reason", "pnl", "pnl_pct", "balance_after",
        }
        for trade in result["trades"]:
            assert required.issubset(trade.keys()), f"Missing: {required - trade.keys()}"

    def test_balance_compounding(self):
        """balance_after should reflect compounding."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST", seed=100.0)
        trades = result["trades"]
        if len(trades) >= 2:
            # Second trade's entry_margin should equal first trade's balance_after
            assert trades[1]["entry_margin"] == trades[0]["balance_after"]

    def test_custom_seed_and_leverage(self):
        """Custom seed should be reflected in results."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST", seed=500.0, leverage=5)
        summary = result["summary"]
        # If no trades, final_balance == seed
        if summary["total_trades"] == 0:
            assert summary["final_balance"] == 500.0

    def test_exit_reason_is_valid(self):
        """Exit reason should be one of SL, TP1, TP2, BE, TIMEOUT, NO_DATA."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        valid_reasons = {"SL", "TP1", "TP2", "BE", "TIMEOUT", "NO_DATA"}
        for trade in result["trades"]:
            assert trade["exit_reason"] in valid_reasons

    def test_win_rate_calculation(self):
        """Win rate = wins / total * 100."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        trades = result["trades"]
        if trades:
            wins = sum(1 for t in trades if t["pnl"] > 0)
            expected = round(wins / len(trades) * 100, 2)
            assert result["summary"]["win_rate"] == expected

    def test_max_drawdown_non_negative(self):
        """Max drawdown should be >= 0."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        assert result["summary"]["max_drawdown"] >= 0

    def test_no_overlapping_positions(self):
        """Trades should not overlap in time."""
        df_1h, df_1m = make_divergence_scenario()
        result = run_backtest_for_coin(df_1h, df_1m, "TEST")
        trades = result["trades"]
        for i in range(1, len(trades)):
            assert trades[i]["entry_time"] > trades[i - 1]["exit_time"]
