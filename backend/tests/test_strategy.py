"""Tests for RSI divergence strategy logic."""
import sys
from pathlib import Path

import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from strategy.rsi_divergence import compute_rsi, find_entry_signals, simulate_exit_on_1m
from helpers import make_1h_candles, make_1m_candles, make_divergence_scenario


class TestComputeRSI:
    def test_rsi_returns_series(self):
        df = make_1h_candles(30)
        rsi = compute_rsi(df)
        assert isinstance(rsi, pd.Series)
        assert len(rsi) == len(df)

    def test_rsi_range(self):
        """RSI values should be between 0 and 100 (inclusive)."""
        df = make_1h_candles(100)
        rsi = compute_rsi(df)
        valid = rsi.dropna()
        assert (valid >= 0).all()
        assert (valid <= 100.01).all()  # pandas-ta can return exactly 100.0

    def test_rsi_first_value_is_nan(self):
        """At minimum the very first RSI value should be NaN."""
        df = make_1h_candles(20)
        rsi = compute_rsi(df, period=14)
        assert pd.isna(rsi.iloc[0])

    def test_rsi_all_up_near_100(self):
        """Monotonically increasing prices should have RSI near 100."""
        prices = [50.0 + i * 1.0 for i in range(50)]
        df = make_1h_candles(50, prices=prices)
        rsi = compute_rsi(df)
        # After warmup, RSI should be very high
        assert rsi.iloc[-1] > 80

    def test_rsi_all_down_near_0(self):
        """Monotonically decreasing prices should have RSI near 0."""
        prices = [100.0 - i * 1.0 for i in range(50)]
        df = make_1h_candles(50, prices=prices)
        rsi = compute_rsi(df)
        assert rsi.iloc[-1] < 20


class TestFindEntrySignals:
    def test_no_signals_on_flat_market(self):
        """Flat prices should produce no divergence signals."""
        prices = [100.0] * 80
        df = make_1h_candles(80, prices=prices)
        signals = find_entry_signals(df)
        assert signals == []

    def test_no_signals_on_uptrend(self):
        """Steadily rising prices shouldn't produce bullish divergence signals."""
        prices = [50.0 + i * 0.5 for i in range(80)]
        df = make_1h_candles(80, prices=prices)
        signals = find_entry_signals(df)
        assert signals == []

    def test_signals_have_required_fields(self):
        """If signals are found, they should have all required fields."""
        df_1h, _ = make_divergence_scenario()
        signals = find_entry_signals(df_1h)
        required_keys = {"signal_idx", "signal_time", "entry_time", "entry_price", "sl_price", "signal_candle_low"}
        for s in signals:
            assert required_keys.issubset(s.keys()), f"Missing keys: {required_keys - s.keys()}"

    def test_entry_price_is_next_candle_open(self):
        """Entry price should be the open of the candle after the signal."""
        df_1h, _ = make_divergence_scenario()
        signals = find_entry_signals(df_1h)
        for s in signals:
            next_candle = df_1h.iloc[s["signal_idx"] + 1]
            assert s["entry_price"] == next_candle["open"]

    def test_sl_price_below_signal_low(self):
        """Stop-loss should be below the signal candle's low."""
        df_1h, _ = make_divergence_scenario()
        signals = find_entry_signals(df_1h)
        for s in signals:
            assert s["sl_price"] < s["signal_candle_low"]

    def test_rsi_threshold_filters(self):
        """Lowering RSI threshold should produce fewer or equal signals."""
        df_1h, _ = make_divergence_scenario()
        signals_40 = find_entry_signals(df_1h, rsi_threshold=40)
        signals_20 = find_entry_signals(df_1h, rsi_threshold=20)
        assert len(signals_20) <= len(signals_40)


class TestSimulateExit:
    def _make_entry_with_1m(self, entry_price, sl_price, price_sequence):
        """Helper: create 1m candles from price sequence and simulate exit."""
        base_ts = 1_700_000_000_000
        df_1m = make_1m_candles(len(price_sequence), base_ts=base_ts, prices=price_sequence)
        return simulate_exit_on_1m(df_1m, entry_price, sl_price, base_ts)

    def test_sl_hit(self):
        """Price drops below SL → exit with SL reason."""
        entry_price = 100.0
        sl_price = 95.0
        # Price drops steadily below SL
        prices = [100.0 - i * 0.5 for i in range(30)]
        result = self._make_entry_with_1m(entry_price, sl_price, prices)
        assert result["exit_reason"] == "SL"
        assert result["exit_price"] == sl_price
        assert result["tp1_hit"] is False

    def test_no_sl_hit_when_price_above_sl(self):
        """If price stays well above SL, SL should not trigger."""
        entry_price = 100.0
        sl_price = 90.0
        prices = [100.0 + 0.01 * (i % 5) for i in range(50)]
        result = self._make_entry_with_1m(entry_price, sl_price, prices)
        assert result["exit_reason"] != "SL"

    def test_tp1_by_price(self):
        """Price reaches +2% → TP1 triggered."""
        entry_price = 100.0
        sl_price = 90.0
        # Gradual rise to trigger TP1 at +2%
        prices = [100.0 + i * 0.15 for i in range(50)]
        result = self._make_entry_with_1m(entry_price, sl_price, prices)
        assert result["tp1_hit"] is True
        assert result["exit_reason"] in ("TP2", "BE", "TIMEOUT")

    def test_empty_candles_returns_no_data(self):
        """Empty 1m candles should return NO_DATA."""
        df_1m = pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
        result = simulate_exit_on_1m(df_1m, 100.0, 95.0, 1_700_000_000_000)
        assert result["exit_reason"] == "NO_DATA"

    def test_tp2_hit(self):
        """Price reaches +5% → TP2 triggered after TP1."""
        entry_price = 100.0
        sl_price = 90.0
        # Sharp rise to +5%
        prices = [100.0 + i * 0.5 for i in range(50)]
        result = self._make_entry_with_1m(entry_price, sl_price, prices)
        assert result["tp1_hit"] is True
        assert result["exit_reason"] == "TP2"

    def test_be_after_tp1(self):
        """After TP1, price drops back to entry → break-even stop."""
        entry_price = 100.0
        sl_price = 90.0
        # Rise to trigger TP1 (+2%), then drop back to entry
        prices = []
        for i in range(20):
            prices.append(100.0 + i * 0.15)  # rise to ~103
        for i in range(30):
            prices.append(103.0 - i * 0.15)  # drop back through 100
        result = self._make_entry_with_1m(entry_price, sl_price, prices)
        assert result["tp1_hit"] is True
        assert result["exit_reason"] == "BE"
