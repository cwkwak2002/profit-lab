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
TP1_CLOSE_RATIO = 0.5    # 50%
RSI_TP1_RR_RATIO = 1.5   # TP1: risk:reward 1:1.5

RSI_THRESHOLD_LONG = 30
TP1_RSI_TARGET_LONG = 70

# Bollinger Band
BB_PERIOD = 20
BB_STD = 2.0

# Hammer candle detection
HAMMER_WICK_RATIO = 2.0  # lower wick >= 2x body
ENGULFING_COVER_PCT = 0.5  # engulfing must cover 50% of prior body

# RSI-specific risk filters
RSI_RISK_INUNDATION_BARS = 10  # RSI below 30 for 10+ consecutive bars → no entry
RSI_RISK_DEAD_ZONE_EMA = 200   # 200 EMA for dead zone check
RSI_RISK_DEAD_ZONE_PCT = 0.10  # price > 10% below 200 EMA → dead zone

# Top 50 Binance Futures coins (90-day cumulative volume, 2026-Q1, excl. commodities)
TOP_COINS = [
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ZEC", "RIVER", "BNB", "1000PEPE", "HYPE",
    "PIPPIN", "SUI", "ADA", "BCH", "AVAX", "LINK", "AXS", "ASTER", "DASH", "TAO",
    "PUMP", "FIL", "POWER", "LTC", "ENA", "BEAT", "ENSO", "DOT", "TRUMP", "NEAR",
    "SIREN", "UNI", "XMR", "FARTCOIN", "AAVE", "WLFI", "BERA", "WIF", "WLD", "IP",
    "LIGHT", "XPL", "DUSK", "BULLA", "PENGU", "1000BONK", "1000SHIB", "ZKP", "SENT", "ARB",
]

# EMA Trend Following strategy defaults
EMA_FAST = 50
EMA_SLOW = 200
ADX_PERIOD = 14
ADX_ENTRY_MIN = 25       # ADX >= 25 to confirm trend
ADX_BLOCK_BELOW = 20     # ADX < 20 = no-trade zone
EMA_GAP_MIN_PCT = 0.005  # 0.5% min gap between EMAs (whipsaw filter)
VOLUME_AVG_PERIOD = 20
EMA_TP_RR_RATIO_LONG = 2.0    # Long risk:reward 1:2
EMA_TP_RR_RATIO_SHORT = 1.5   # Short risk:reward 1:1.5
EMA_TP1_CLOSE_RATIO = 0.5

# BB Squeeze Breakout strategy defaults (15m timeframe)
SQZ_BB_PERIOD = 20
SQZ_BB_STD = 2.0
SQZ_WIDTH_LOOKBACK = 100    # recent N bars to rank BB width
SQZ_WIDTH_PERCENTILE = 20   # bottom 20% = squeeze zone
SQZ_MIN_SQUEEZE_BARS = 15   # squeeze must last >= 15 bars
SQZ_VOLUME_MULT_LONG = 2.0  # Long: volume >= 200% of average
SQZ_VOLUME_MULT_SHORT = 2.5 # Short: volume >= 250% of average
SQZ_VOLUME_AVG_PERIOD = 20
SQZ_SHORT_TP_PCT = 0.035    # Short: fixed +3.5% take profit

# Risk Avoidance Filters (strategies B & C)
RISK_EMA_GAP_MIN_PCT = 0.005     # EMA gap < 0.5% → no entry
RISK_ADX_MIN = 20                 # 1H ADX(14) < 20 → no entry
RISK_SPIKE_PCT = 0.03             # 5-min 3%+ move → cooldown
RISK_SPIKE_COOLDOWN_MS = 60 * 60 * 1000  # 60 min cooldown
RISK_BTC_CRASH_PCT = -0.05       # BTC 1H -5%+ → no altcoin longs

# Exchange
EXCHANGE_ID = "binance"
