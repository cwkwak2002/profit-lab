# Profit-Lab

크립토 선물 트레이딩 전략 백테스트 & AI 벤치마크 플랫폼

## Overview

매매 전략의 유효성을 검증하기 위한 백테스트 엔진과 결과 대시보드, 그리고 AI 모델별 실시간 모의 투자 성과를 비교하는 벤치마크 시스템입니다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| **백엔드** | FastAPI, Python, pandas, pandas-ta, numpy |
| **프론트엔드** | Next.js 16 (App Router), React 19, TypeScript, TailwindCSS |
| **차트** | Recharts (수익곡선), Lightweight Charts (캔들차트 + 트레이드 마커) |
| **테이블** | TanStack Table v8 (필터/정렬/페이지네이션) |
| **DB** | SQLite (WAL mode) |
| **데이터 수집** | CCXT (Binance Futures) |
| **UI** | shadcn/ui, Lucide Icons |

## Features

### 1. 멀티 전략 백테스트

세 가지 트레이딩 전략을 지원하며, 공통 위험 회피 필터를 적용합니다.

- **RSI Divergence (Long Only)** — RSI 상승 다이버전스 + BB 회귀 + W-패턴 확인 + 캔들 반전 패턴의 4중 필터
- **EMA Trend Following (Long & Short)** — 1H EMA 50/200 크로스오버 + ADX ≥ 25 추세 확인, 15m 풀백 진입
- **Bollinger Band Squeeze (Long & Short)** — BB 폭 하위 20% 스퀴즈 감지, 볼륨 스파이크 동반 브레이크아웃 진입

**위험 회피 필터**: 가격 급변 쿨다운, RSI 과매도 침수, 데드존 회피, BTC 급락 가드

### 2. 결과 대시보드

- **Equity Curve** — 시간에 따른 누적 수익 곡선
- **Candle Chart** — 진입/청산 마커가 표시된 캔들차트 + RSI 서브차트
- **Trade Table** — 포지션별 진입/청산 시간, 가격, 증거금, 수익률, 청산 사유
- **Coin Summary** — 멀티 코인 결과 종합 (정렬/필터)

### 3. AI 벤치마크 시스템

AI 모델별 실시간 모의 투자 성과를 비교합니다.

- 주문 입력: 모델명, 코인, 방향, Entry/TP1/TP2/SL, 신뢰도
- 실시간 가격 모니터링 (5초 간격)
- 주문 생명주기: PENDING → FILLED → CLOSED (또는 CANCELLED)
- 듀얼 TP: TP1에서 50% 청산 (SL → BE 이동), 나머지 TP2 또는 타임아웃
- 리더보드: 승률, Profit Factor, MDD, 수익률 기준 랭킹
- SSE를 통한 실시간 상태 업데이트

## Project Structure

```
profit-lab/
├── backend/
│   ├── main.py                 # FastAPI 앱 엔트리포인트
│   ├── config.py               # 설정 (코인 목록, 전략 파라미터, 수수료)
│   ├── data/
│   │   ├── db.py               # SQLite DB 연산
│   │   └── fetcher.py          # CCXT Binance Futures 데이터 수집
│   ├── strategy/
│   │   ├── rsi_divergence.py   # RSI 다이버전스 전략
│   │   ├── ema_trend.py        # EMA 추세 추종 전략
│   │   ├── bb_squeeze.py       # BB 스퀴즈 전략
│   │   └── risk_filters.py     # 공통 위험 회피 필터
│   ├── engine/
│   │   ├── backtester.py       # 백테스트 엔진
│   │   └── benchmark_monitor.py # 실시간 가격 모니터링
│   ├── routers/
│   │   ├── data.py             # 데이터 동기화 API
│   │   ├── backtest.py         # 백테스트 실행/결과 API
│   │   └── benchmark.py        # 벤치마크 API + SSE
│   └── tests/                  # 유닛 테스트
│
├── frontend/
│   ├── app/
│   │   ├── backtest/           # 백테스트 입력 & 결과 페이지
│   │   └── benchmark/          # 벤치마크 주문 & 리더보드 페이지
│   ├── components/             # 차트, 테이블, UI 컴포넌트
│   └── lib/api.ts              # API 클라이언트
│
└── SPEC.md                     # 상세 기술 스펙
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

## Configuration

`backend/config.py`에서 설정을 관리합니다:

- **대상 종목**: Binance Futures 거래량 상위 50종
- **거래 파라미터**: 수수료 (0.04%), 슬리피지 (0.05%), 레버리지 (10x), 시드 ($100)
- **전략 파라미터**: RSI 기간, BB 기간, EMA 기간, ADX 임계값
- **위험 필터**: 급변 감지 %, 쿨다운 시간, BTC 가드

## API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| `POST` | `/api/data/sync` | 캔들 데이터 수집 & 저장 |
| `POST` | `/api/backtest/run-stream` | 백테스트 실행 (SSE 진행률) |
| `GET` | `/api/backtest/{id}/summary` | 백테스트 결과 요약 |
| `GET` | `/api/backtest/{id}/coins` | 코인별 결과 목록 |
| `GET` | `/api/backtest/{id}/coins/{symbol}/trades` | 트레이드 상세 |
| `GET` | `/api/data/candles` | 캔들 데이터 + 지표 조회 |
| `POST` | `/api/benchmark/orders` | 벤치마크 주문 제출 |
| `GET` | `/api/benchmark/models` | 모델 리더보드 |
| `GET` | `/api/benchmark/models/{id}` | 모델 상세 |
| `GET` | `/api/benchmark/stream` | 실시간 SSE 스트림 |
