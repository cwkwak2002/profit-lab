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
RSI_THRESHOLD = 40
LOOKBACK_CANDLES = 50
SL_OFFSET_PCT = 0.005   # 0.5%
TP1_PROFIT_PCT = 0.02    # 2%
TP1_RSI_TARGET = 70
TP1_CLOSE_RATIO = 0.5    # 50%
TP2_PROFIT_PCT = 0.05    # 5%

# Top 50 Hyperliquid coins
TOP_COINS = [
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "MATIC",
    "UNI", "ATOM", "FIL", "LTC", "NEAR", "APT", "ARB", "OP", "SUI", "SEI",
    "INJ", "TIA", "JUP", "WIF", "PEPE", "BONK", "RENDER", "FET", "TAO", "AAVE",
    "MKR", "CRV", "LDO", "RUNE", "STX", "IMX", "MANTA", "DYM", "STRK", "PYTH",
    "JTO", "W", "ENA", "ETHFI", "ONDO", "PENDLE", "WLD", "BLUR", "ORDI", "TRX",
]

# Exchange
EXCHANGE_ID = "hyperliquid"
