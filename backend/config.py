from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data" / "profit-lab.db"

# Trading defaults
DEFAULT_SEED = 100.0
DEFAULT_LEVERAGE = 10
TAKER_FEE = 0.0004  # 0.04%
SLIPPAGE = 0.0005    # 0.05%

# RSI Divergence strategy defaults
RSI_PERIOD = 14
LOOKBACK_CANDLES = 50
SL_OFFSET_PCT = 0.005   # 0.5%
TP1_PROFIT_PCT = 0.02    # 2%
TP1_CLOSE_RATIO = 0.5    # 50%
TP2_PROFIT_PCT = 0.05    # 5%

RSI_THRESHOLD_LONG = 30
TP1_RSI_TARGET_LONG = 70

# Bollinger Band
BB_PERIOD = 20
BB_STD = 2.0

# Hammer candle detection
HAMMER_WICK_RATIO = 2.0  # lower wick >= 2x body

# Top 50 Binance Futures coins (90-day cumulative volume, 2026-Q1, excl. commodities)
TOP_COINS = [
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ZEC", "RIVER", "BNB", "1000PEPE", "HYPE",
    "PIPPIN", "SUI", "ADA", "BCH", "AVAX", "LINK", "AXS", "ASTER", "DASH", "TAO",
    "PUMP", "FIL", "POWER", "LTC", "ENA", "BEAT", "ENSO", "DOT", "TRUMP", "NEAR",
    "SIREN", "UNI", "XMR", "FARTCOIN", "AAVE", "WLFI", "BERA", "WIF", "WLD", "IP",
    "LIGHT", "XPL", "DUSK", "BULLA", "PENGU", "1000BONK", "1000SHIB", "ZKP", "SENT", "ARB",
]

# Exchange
EXCHANGE_ID = "binance"
