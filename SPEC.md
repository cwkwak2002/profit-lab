# Profit-Lab: RSI 다이버전스 백테스트 대시보드 개발 스펙

## Context
코인선물 트레이딩 봇 개발에 앞서, 매매전략의 유효성을 검증하기 위한 백테스트 엔진과 결과 대시보드를 구축한다. 1차 목표는 RSI 상승 다이버전스 전략의 과거 수익률을 정밀 검증하는 것이며, 향후 다양한 전략 및 AI 추천 전략 실시간 검증으로 확장할 예정이다.

---

## 1. 기술 스택

| 영역 | 기술 |
|------|------|
| **백테스트 엔진** | Python (pandas, numpy, ccxt, pandas-ta) |
| **API 서버** | FastAPI |
| **프론트엔드** | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| **차트** | Recharts (수익곡선) + Lightweight Charts (캔들차트, 선택적) |
| **테이블** | TanStack Table (필터/정렬/페이지네이션) |
| **DB** | SQLite |
| **데이터 수집** | ccxt (Hyperliquid) |

---

## 2. 데이터 요구사항

- **거래소**: Hyperliquid (CCXT 호환)
- **대상 종목**: 주요 선물 페어 상위 50종
- **타임프레임**:
  - Main: 1시간 봉 (전략 신호 포착)
  - Sub: 1분 봉 (체결/SL/TP 전수 검증)
- **기간**: 사용자 지정 (기본: 2026-01-01 ~ 현재)

---

## 3. 전략 알고리즘: RSI 상승 다이버전스

### 3-1. 진입 조건 (Entry) — 1H 봉 기준
1. **Price Lower Low**: 현재 1H 종가 < 직전 N개(기본 50) 캔들의 최저가
2. **RSI Higher Low**: 현재 1H RSI(14) > 직전 저점 당시 RSI
3. **RSI 범위**: 현재 RSI ≤ 40
4. **진입 시점**: 조건 확정된 1H 봉 마감 직후, 다음 봉 시가(Open)에 진입

### 3-2. 청산 및 관리 로직 (Exit) — 1m 봉 기준
| 단계 | 조건 | 행동 |
|------|------|------|
| **손절 (SL)** | 진입 캔들 저가(Low) - 0.5% | 전량 청산 |
| **1차 익절 (TP1)** | 1m RSI ≥ 70 **또는** 수익률 +2% | 50% 물량 청산 |
| **본절로스** | TP1 체결 즉시 | 잔여 50% 손절가를 진입가로 이동 |
| **2차 익절 (TP2)** | 수익률 +5% | 전량 청산 |

### 3-3. 우선순위 판별
- 동일 1m 캔들 내 SL/TP 동시 터치 시, Low → High 순서로 판별

---

## 4. 백테스트 실행 조건

| 항목 | 값 |
|------|---|
| **코인별 초기 시드** | $100 |
| **레버리지** | 10x |
| **포지션 크기** | 항상 전액 투입 (Full Seed) |
| **복리 방식** | 이전 포지션 결과가 다음 시드에 반영 |
| **수수료** | Taker 0.04% (진입/청산 각각 적용) |
| **슬리피지** | 0.05% ~ 0.1% (설정 가능) |

---

## 5. API 엔드포인트 설계

### 5-1. 데이터 수집
- `POST /api/data/sync` — 지정 코인/기간의 1H, 1m 봉 데이터 수집 및 DB 저장

### 5-2. 백테스트 실행
- `POST /api/backtest/run` — 백테스트 실행
  - params: `coins[]`, `start_date`, `end_date`, `strategy_params`(선택)
  - response: 실행 ID 반환

### 5-3. 결과 조회
- `GET /api/backtest/{id}/summary` — 전체 요약 (총 수익률, 승률, MDD 등)
- `GET /api/backtest/{id}/coins` — 코인별 요약 리스트
- `GET /api/backtest/{id}/coins/{symbol}/trades` — 특정 코인 포지션 상세 로그

---

## 6. 프론트엔드 페이지 구성

### 6-1. 백테스트 실행 페이지 (`/backtest`)
- **입력 필드**: 시작일, 종료일, 코인 선택 (멀티셀렉트, 50종)
- **실행 버튼** → 백테스트 실행 후 결과 페이지로 이동

### 6-2. 결과 요약 페이지 (`/backtest/{id}`)
- **전체 통계 카드**: 총 수익률, 평균 승률, 평균 MDD
- **코인별 요약 테이블**: 코인명, 총 거래수, 승률, 수익률, MDD
  - 정렬/필터 지원
  - 행 클릭 → 코인 상세 페이지로 이동

### 6-3. 코인 상세 페이지 (`/backtest/{id}/coins/{symbol}`)
- **통계 카드**: 해당 코인 수익률, 승률, MDD, 최종 잔액
- **수익 곡선 차트** (Equity Curve): Recharts 라인 차트
- **포지션 상세 테이블** (시간 오름차순):
  - 진입시점 | 진입가 | 진입마진 | 청산시점 | 청산가 | 종료사유(SL/TP1/TP2/본절) | P&L($) | P&L(%) | 잔액

---

## 7. DB 스키마 (SQLite)

```sql
-- 캔들 데이터
CREATE TABLE candles (
    symbol TEXT,
    timeframe TEXT,  -- '1h' or '1m'
    timestamp INTEGER,
    open REAL, high REAL, low REAL, close REAL, volume REAL,
    PRIMARY KEY (symbol, timeframe, timestamp)
);

-- 백테스트 실행 기록
CREATE TABLE backtest_runs (
    id TEXT PRIMARY KEY,
    created_at TEXT,
    start_date TEXT,
    end_date TEXT,
    coins TEXT,  -- JSON array
    params TEXT  -- JSON (strategy params)
);

-- 코인별 백테스트 결과 요약
CREATE TABLE backtest_coin_summary (
    run_id TEXT,
    symbol TEXT,
    total_trades INTEGER,
    win_rate REAL,
    cumulative_return REAL,
    max_drawdown REAL,
    final_balance REAL,
    PRIMARY KEY (run_id, symbol)
);

-- 개별 포지션 로그
CREATE TABLE trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    symbol TEXT,
    entry_time TEXT,
    entry_price REAL,
    entry_margin REAL,
    exit_time TEXT,
    exit_price REAL,
    exit_reason TEXT,  -- 'SL', 'TP1', 'TP2', 'BE'
    pnl REAL,
    pnl_pct REAL,
    balance_after REAL
);
```

---

## 8. 프로젝트 디렉토리 구조

```
profit-lab/
├── backend/
│   ├── main.py              # FastAPI 앱
│   ├── config.py             # 설정값 (수수료, 슬리피지 등)
│   ├── data/
│   │   ├── fetcher.py        # ccxt 데이터 수집
│   │   └── db.py             # SQLite 연결/쿼리
│   ├── strategy/
│   │   └── rsi_divergence.py # RSI 다이버전스 전략 로직
│   ├── engine/
│   │   └── backtester.py     # 백테스트 엔진 (멀티TF 처리)
│   └── routers/
│       ├── data.py           # 데이터 수집 API
│       └── backtest.py       # 백테스트 실행/조회 API
├── frontend/
│   ├── app/
│   │   ├── page.tsx                          # 메인 (→ /backtest 리다이렉트)
│   │   ├── backtest/
│   │   │   ├── page.tsx                      # 백테스트 실행 페이지
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # 결과 요약 페이지
│   │   │       └── coins/[symbol]/page.tsx   # 코인 상세 페이지
│   │   └── layout.tsx
│   ├── components/
│   │   ├── equity-curve.tsx
│   │   ├── trade-table.tsx
│   │   └── coin-summary-table.tsx
│   └── lib/
│       └── api.ts            # Backend API 호출 함수
├── data/
│   └── profit-lab.db         # SQLite DB 파일
└── README.md
```

---

## 9. 향후 확장 계획 (참고)

- **전략 추가**: RSI 외 다양한 전략 모듈 플러그인 방식 지원
- **AI 추천 검증**: 여러 AI가 1시간마다 추천 → 실제 성과 기록/비교 대시보드
- **실시간 모니터링**: 라이브 데이터 연동

---

## 10. 검증 방법

1. **백엔드 단위 테스트**: RSI 계산, 다이버전스 감지, SL/TP 체결 로직 각각 검증
2. **수동 검증**: 특정 코인 1~2건의 트레이드를 수작업으로 계산 후 엔진 결과와 대조
3. **프론트엔드**: 백테스트 실행 → 결과 요약 → 코인 상세 → 포지션 로그 전체 흐름 확인
