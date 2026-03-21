"""Shared test helper functions."""
import pandas as pd
import numpy as np


def make_1h_candles(n: int, base_ts: int = 1_700_000_000_000,
                    base_price: float = 100.0,
                    prices: list[float] | None = None) -> pd.DataFrame:
    if prices is None:
        prices = [base_price + np.sin(i / 5) * 5 for i in range(n)]
    rows = []
    for i, close in enumerate(prices):
        ts = base_ts + i * 3_600_000
        rows.append({
            "timestamp": ts, "open": close * 0.999, "high": close * 1.005,
            "low": close * 0.995, "close": close, "volume": 1000.0,
        })
    return pd.DataFrame(rows)


def make_1m_candles(n: int, base_ts: int = 1_700_000_000_000,
                    base_price: float = 100.0,
                    prices: list[float] | None = None) -> pd.DataFrame:
    if prices is None:
        prices = [base_price + (i % 60) * 0.01 for i in range(n)]
    rows = []
    for i, close in enumerate(prices):
        ts = base_ts + i * 60_000
        rows.append({
            "timestamp": ts, "open": close * 0.9999, "high": close * 1.001,
            "low": close * 0.999, "close": close, "volume": 100.0,
        })
    return pd.DataFrame(rows)


def make_divergence_scenario() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Create a scenario where RSI bullish divergence occurs."""
    n_1h = 80
    base_ts = 1_700_000_000_000
    prices = []
    for i in range(n_1h):
        if i < 20:
            prices.append(100.0 - i * 0.3)
        elif i < 40:
            prices.append(94.0 + (i - 20) * 0.5)
        elif i < 55:
            prices.append(104.0 - (i - 40) * 1.2)
        elif i < 65:
            prices.append(86.0 + (i - 55) * 1.0)
        elif i < 75:
            prices.append(96.0 - (i - 65) * 1.5)
        else:
            prices.append(81.0 + (i - 75) * 2.0)
    df_1h = make_1h_candles(n_1h, base_ts=base_ts, prices=prices)
    n_1m = n_1h * 60
    prices_1m = []
    for i in range(n_1h):
        h_price = prices[i]
        for j in range(60):
            variation = (j - 30) / 30 * 0.5
            prices_1m.append(h_price + variation)
    df_1m = make_1m_candles(n_1m, base_ts=base_ts, prices=prices_1m)
    return df_1h, df_1m
