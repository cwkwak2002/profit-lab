# Profit-Lab: 트레이딩 전략 백테스트 & AI 벤치마크 플랫폼 개발 스펙

## Context
코인선물 트레이딩 봇 개발에 앞서, 매매전략의 유효성을 검증하기 위한 백테스트 엔진과 결과 대시보드를 구축한다. 또한 AI 모델별 실시간 모의 투자 성과를 비교하는 벤치마크 시스템을 포함한다.

---

## 1. 기술 스택

| 영역 | 기술 |
|------|------|
| **백테스트 엔진** | Python (pandas, numpy, ccxt, pandas-ta) |
| **API 서버** | FastAPI |
| **프론트엔드** | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| **차트** | TradingView Charting Library (캔들차트) + Recharts (수익곡선) |
| **테이블** | TanStack Table (필터/정렬/페이지네이션) |
| **DB** | SQLite |
| **데이터 수집** | ccxt (Bybit Futures) |

---

## 2. 데이터 요구사항

- **거래소**: Bybit Futures (CCXT 호환)
- **페어 포맷**: `{SYMBOL}/USDT:USDT` (PEPE → `1000PEPE/USDT:USDT` 자동 매핑)
- **대상 종목**: 안정적 상위 30개 Bybit Futures 코인
- **데이터 저장**: SQLite에 저장하여 증분 동기화 (이미 DB에 있는 구간은 스킵)
- **타임프레임**:
  - DB 저장: 1m, 1h (두 가지 원본 데이터)
  - 5m, 15m, 30m은 1m에서 리샘플링
  - 4h, 1D는 1h에서 리샘플링
  - 전략 신호: 1h (원본)
  - 체결/SL/TP 검증: 1m (원본)
- **기간**: 사용자 지정 (기본: 2026-01-01 ~ 현재)

---

## 3. 전략 알고리즘: RSI 상승 다이버전스 (Long Only)

### 3-1. 진입 조건 (Entry) — 4중 필터, 1H 봉 기준
다음 4가지 조건이 **모두 충족된 1시간 봉 마감 시** 다음 봉 시가에 진입:
1. **RSI 상승 다이버전스**: 가격은 저점을 낮추고(Lower Low), RSI(14)는 저점을 높임(Higher Low). 두 저점 중 최소 하나는 **RSI 30 미만** 필수.
2. **볼린저 밴드(BB) 회귀**: 가격이 BB(20, 2σ) 하단선을 터치/이탈한 후, 다시 **밴드 내부로 들어와서 종가가 형성**.
3. **RSI 30선 재돌파 (W-Pattern)**: RSI가 30 아래에서 머물다가 다시 **30선을 상향 돌파**하며 과매도 구간 탈출 확정.
4. **캔들 반전 패턴 (Confirmation)**: 진입 캔들이 **망치형(Hammer)** 또는 직전 음봉의 몸통을 50% 이상 덮는 **상승 장악형 양봉**.

### 3-2. 위험 회피 필터 (Risk Avoidance)
아래 조건 중 하나라도 해당되면 진입 차단:
| # | 조건 | 행동 |
|---|------|------|
| 1 | 5분 내 가격 3%+ 급변 | 60분 쿨다운 (변동성 폭발) |
| 2 | RSI 30 이하 연속 10봉+ | 진입 금지 (RSI 침수) |
| 3 | BTC 1H -5%+ 급락 | 알트코인 Long 진입 금지 (BTC 가드) |
| 4 | 가격이 1H 200 EMA 대비 -10% 이상 이격 | 진입 금지 (데드 존) |

### 3-3. 청산 및 자금 관리 (Exit & RM) — 1m 봉 기준
| 단계 | 조건 | 행동 |
|------|------|------|
| **손절 (SL)** | 다이버전스 최근 저가 - 0.5% | 전량 청산 |
| **1차 익절 (TP1)** | 1m RSI ≥ 70 **또는** 손익비(RR) 1.5배 | 50% 물량 청산, 손절가를 본절로 이동 |
| **2차 익절 (TP2)** | 15m 200 EMA 터치 | 잔여 전량 청산 |

### 3-4. 우선순위 판별
- 동일 캔들 내 SL/TP 동시 터치 시, Low → High 순서로 판별

### 3-5. 데이터 소스
- Bybit Futures는 수년간의 1m 봉 히스토리를 제공하므로 1m 정밀 시뮬레이션이 전 기간 가능

---

## 3B. 전략 알고리즘: EMA Trend Following (Long & Short)

### 3B-1. 추세 확인 (Trend) — 1H 봉 기준
1. **Long (정배열)**: 50 EMA > 200 EMA (골든크로스)
2. **Short (역배열)**: 50 EMA < 200 EMA (데드크로스)
3. **ADX 확인**: ADX(14) ≥ 25 — 추세 강도 충분
4. **No-Trade Zone**: ADX < 20 또는 50/200 EMA 간격 < 0.5% (Whipsaw 구간) → 진입 차단

### 3B-2. 진입 조건 (Entry) — 15m 봉 기준
1. **Long**: 직전 캔들 저가가 15m 50 EMA 이하 (pullback) → 현재 캔들 종가가 50 EMA 재돌파
2. **Short**: 직전 캔들 고가가 15m 50 EMA 이상 (bounce) → 현재 캔들 종가가 50 EMA 재이탈
3. **거래량**: 현재 거래량 > 최근 20봉 평균 거래량
4. **진입 시점**: 조건 확정된 15m 봉 마감 직후, 다음 봉 시가(Open)에 진입

### 3B-3. 청산 및 관리 로직 (Exit)
| 단계 | 조건 | 행동 |
|------|------|------|
| **손절 (SL)** | 15m 200 EMA 이탈 (동적 추적) | 전량 청산 |
| **1차 익절 (TP1) — Long** | 손익비 1:2 지점 도달 | 50% 물량 청산 |
| **1차 익절 (TP1) — Short** | 손익비 1:1.5 지점 도달 | 50% 물량 청산 |
| **본절로스 (BE)** | TP1 체결 즉시 | 잔여 50% 손절가를 진입가로 이동 |
| **EMA 역크로스** | 15m EMA 역크로스 발생 | 잔여 전량 청산 |

---

## 3C. 전략 알고리즘: BB Squeeze Breakout (Long & Short)

### 3C-1. 스퀘즈 확인 — 15m 봉 기준
1. **BB Width**: 볼린저 밴드(20, 2σ) 폭이 최근 100봉 중 하위 20% = 응축 구간
2. **최소 지속**: 스퀘즈 상태가 최소 15봉 이상 지속된 후의 돌파만 유효

### 3C-2. 진입 조건 (Entry) — 15m 봉 기준
1. **Long**: 종가 > BB 상단 + 거래량 ≥ 20봉 평균의 200% + 하단 밴드 기울기 음수 (확장 확인)
2. **Short**: 종가 < BB 하단 + 거래량 ≥ 20봉 평균의 250%
3. **진입 시점**: 조건 확정된 15m 봉 마감 직후, 다음 봉 시가(Open)에 진입

### 3C-3. 청산 및 관리 로직 (Exit)
| 단계 | 조건 | 행동 |
|------|------|------|
| **손절 (SL)** | BB 중심선(20 SMA) 터치 | 전량 청산 |
| **Long 트레일링 (TRAIL)** | 수익 발생 후 밴드 안쪽 복귀 시 | 트레일링 스탑 (고점 -1% 또는 중심선) |
| **Short 익절 (TP)** | 고정 수익률 +3.5% 도달 | 즉시 전량 청산 |

---

## 3D. 리스크 회피 필터 (전략 B·C)

| # | 조건 | 행동 |
|---|------|------|
| 1 | 1H 50/200 EMA 간격 < 0.5% | 진입 금지 |
| 2 | 15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힘 | 진입 금지 |
| 3 | 1H ADX(14) < 20 | 진입 금지 |
| 4 | BB 상단 돌파 시 하단 밴드 기울기 ≥ 0 | Long 진입 금지 |
| 5 | 5분 내 3%+ 급등/급락 발생 | 해당 심볼 60분 쿨다운 |
| 6 | BTC 1H 수익률 ≤ -5% | 알트코인 Long 진입 금지 |

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
- `POST /api/backtest/run-stream` — 백테스트 실행 (SSE 진행률 스트리밍)

### 5-3. 결과 조회
- `GET /api/backtest/{id}/summary` — 전체 요약 (총 수익률, 승률, MDD 등)
- `GET /api/backtest/{id}/coins` — 코인별 요약 리스트
- `GET /api/backtest/{id}/coins/{symbol}/trades` — 특정 코인 포지션 상세 로그

### 5-4. 차트/시세 데이터
- `GET /api/data/candles?symbol={symbol}&timeframe={tf}&start_date={date}&end_date={date}` — 캔들 데이터 조회
  - timeframe: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1D`
  - 1m, 1h은 DB에서 직접 조회; 5m/15m/30m은 1m에서, 4h/1D는 1h에서 리샘플링
  - `strategy` 파라미터로 전략별 인디케이터 포함 (RSI, EMA+ADX, BB+Width)
- `GET /api/data/ticker?symbol={symbol}` — Bybit 실시간 현재가 조회

### 5-5. AI 벤치마크
- `GET /api/benchmark/model-names` — 모델 이름 목록 (autocomplete)
- `GET /api/benchmark/models` — 전체 모델 + 성과 지표 (리더보드)
- `GET /api/benchmark/models/{id}` — 모델 상세 + 성과 지표
- `GET /api/benchmark/models/{id}/orders` — 모델의 전체 주문 내역
- `GET /api/benchmark/models/{id}/batches` — 모델의 배치 목록 (시장 분석 포함)
- `POST /api/benchmark/orders` — 배치 주문 제출 (model_name + market_analysis + orders[])
- `GET /api/benchmark/stream` — SSE 실시간 주문 상태 변경 이벤트

---

## 5B. AI 벤치마크 (AI Benchmark)

AI 모델별 실시간 모의 투자 성과를 비교하는 시스템. 사용자가 AI 모델명과 주문을 입력하면, 실시간 Bybit 가격을 모니터링하여 체결/청산을 자동 처리하고 모델별 성과를 리더보드로 비교한다.

### 5B-1. 워크플로우
1. 사용자가 AI 모델명, 시장 분석, 주문(코인/방향/유형/진입가/TP1/TP2/SL/확신도)을 입력
2. 시장 분석만 제출할 수도 있음 (주문 없이)
3. Market 주문은 즉시 FILLED, Limit 주문은 PENDING으로 시작
4. 시스템이 실시간 Bybit 가격을 5초 간격으로 모니터링
5. 모델별 성과 지표를 리더보드로 비교

### 5B-2. 주문 라이프사이클
```
[Limit]  PENDING ──(가격 도달)──→ FILLED ──(TP/SL/6H)──→ CLOSED
            │
            └──(30분 미체결)──→ CANCELLED

[Market] FILLED (즉시) ──(TP/SL/6H)──→ CLOSED

[Dual TP] FILLED ──(TP1 도달)──→ 50% 청산 + SL→본절 ──(TP2/SL_BE/6H)──→ CLOSED
```

### 5B-3. 주문 속성
| 속성 | 설명 |
|---|---|
| **order_type** | `limit` (가격 도달 시 체결) 또는 `market` (즉시 체결) |
| **confidence** | 1~5 (5가 가장 확신), 주문별 확신도 |
| **tp2_price** | 선택적 2차 익절가. 설정 시 TP1→50% 청산 + SL 본절 이동 → TP2까지 나머지 유지 |
| **market_analysis** | 배치 단위 시장 분석 (전체 주문에 적용) |

### 5B-4. 주문 규칙
- **마진 배분**: 가용잔액 / 주문 수 (균등 배분)
- **가용잔액**: balance - SUM(PENDING+FILLED 주문의 margin)
- **Timeout**: 미체결 30분 → 자동 취소, 포지션 6시간 → 현재가 강제 청산
- **가격 모니터링**: 5초 간격 (`fetch_tickers` 일괄 호출)
- **Dual TP 동작**: TP1 도달 → 마진 50% 해당 P&L 실현, 잔여 50% SL을 진입가(본절)로 이동, TP2 또는 본절 SL까지 유지

### 5B-5. P&L 계산
```
position_size = margin × leverage (10x)
raw_pnl = position_size × (close - entry) / entry × direction
fees = position_size × (taker_fee + slippage) × 2  (진입 + 청산)
net_pnl = max(raw_pnl - fees, -margin)  (마진 이상 손실 방지)

[Dual TP]
  TP1: 50% margin에 대한 P&L 즉시 실현, 모델 잔액에 반영
  TP2/SL_BE/Timeout: 나머지 50%에 대한 P&L 실현
  최종 P&L = tp1_pnl + remaining_pnl
```

### 5B-6. 성과 지표
| 지표 | 설명 |
|---|---|
| Win Rate | 수익 청산 / 전체 청산 × 100 |
| MDD | balance_after 시계열의 최대 낙폭 |
| Profit Factor | 총 수익 / 총 손실 |
| 평균 보유시간 | 체결~청산 시간 평균 (분) |
| 체결률 | (FILLED+CLOSED) / 전체 주문 × 100 |
| 누적 P&L | 현재 잔액 - seed |

### 5B-7. 설정
- Seed: $100, Leverage: 10x
- 지원 코인: Top 30 Bybit Futures (config.py TOP_COINS)
- 수수료/슬리피지: 백테스트와 동일 (Taker 0.04%, Slippage 0.05%)

### 5B-8. 주문 소스 (source)
| source | 설명 |
|---|---|
| `manual` | 사용자가 UI에서 직접 입력한 주문 (기본값) |
| `ai_trader` | AI Auto-Trader (Calico)가 자동 제출한 주문 |
| `telegram` | Telegram Listener가 시그널 기반으로 제출한 주문 |

- `telegram` 소스 주문은 벤치마크 모니터의 자동 TP/SL 체결에서 제외

---

## 5C. AI Auto-Trader (Calico)

Claude Sonnet 4 API를 활용한 자동 매매 시스템. 5분 간격으로 실행.

### 5C-1. 워크플로우
1. Bybit Futures에서 TOP_COINS 30개의 시세, 24h 변동률, 거래량, 펀딩레이트 수집
2. 데이터를 Claude Sonnet 4 API에 전송, 단기(1시간~12시간) 추천 3~5개 요청
3. Claude 응답을 JSON 파싱하여 entry/tp/sl/confidence/reason 추출
4. 진입가, TP/SL 방향 유효성 검증 후 벤치마크 주문으로 제출
5. prompt + response를 `data/ai_trader_logs/{timestamp}.json`에 저장

### 5C-2. 설정
- 모델명: "Claude Sonnet 4 (Calico)"
- Claude 모델: claude-sonnet-4-20250514
- 실행 간격: 300초 (5분)
- 마진 배분: 가용잔액을 추천 수로 균등 배분
- 주문 유형: limit (Claude가 제시한 진입가 사용)
- API 키: `.env` 파일의 `ANTHROPIC_API_KEY`

---

## 5D. Telegram Listener (Mirroly Live)

Telegram 채널의 트레이딩 시그널을 자동 수신·실행하는 시스템.

### 5D-1. 워크플로우
1. Telethon userbot으로 MirrorlyLive 채널에 연결
2. 신규 메시지 수신 시 시그널 파싱
3. entry 시그널: 시장가 즉시 체결 (마진 = 잔액의 50%)
4. exit 시그널: 해당 포지션 시장가 청산, P&L 계산
5. 모든 메시지를 `data/telegram_logs/{timestamp}.json`에 저장

### 5D-2. 시그널 패턴
| 패턴 | 예시 | 해석 |
|---|---|---|
| `longing {COIN}` | "now longing HYPE at $38" | HYPE long 진입 |
| `shorting {COIN}` | "now shorting BTC at $70k" | BTC short 진입 |
| `closed {COIN} {side}` | "closed HYPE long" | HYPE long 청산 |

### 5D-3. 설정
- 모델명: "Mirroly Live"
- 마진 비율: 잔액의 50%
- TP/SL: 없음 (exit 시그널로만 청산)
- 텔레그램 연결: `.env` 파일의 `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_CHANNEL`
- 첫 실행 시 `python -m engine.telegram_listener`로 세션 파일 생성 필요

---

## 6. 프론트엔드 페이지 구성

### 6-1. 백테스트 실행 페이지 (`/backtest`)
- **입력 필드**: 시작일, 종료일, 코인 선택 (멀티셀렉트, 30종)
- **실행 버튼** → 백테스트 실행 후 결과 페이지로 이동

### 6-2. 결과 요약 페이지 (`/backtest/{id}`)
- **전체 통계 카드**: 총 수익률, 평균 승률, 평균 MDD
- **코인별 요약 테이블**: 코인명, 총 거래수, 승률, 수익률, MDD
  - 정렬/필터 지원
  - 행 클릭 → 코인 상세 페이지로 이동

### 6-3. 코인 상세 페이지 (`/backtest/{id}/coins/{symbol}`)

**레이아웃: 2-column split**
- **왼쪽 사이드바** (고정 폭): 주요 지표 카드를 세로로 배치 (수익률, 승률, 거래수, MDD, 최종 잔액)
- **오른쪽 메인 영역** (flex-1): 상단과 하단을 드래그로 비율 조절 가능한 리사이저로 분리
  - **상단**: 탭으로 전환 가능한 차트 영역
    - `수익 곡선` 탭: Recharts 라인 차트 (Equity Curve)
    - `차트` 탭: TradingView Charting Library 캔들스틱 차트
      - 타임프레임 선택: 1m, 5m, 15m, 30m, 1h, 4h, 1D (기본 5m, localStorage 유지)
      - 트레이드 마커 표시: 주문(회색), 진입(초록/빨강), 청산(색상+P&L)
      - 오픈 포지션(FILLED/PENDING) 코인은 1초 간격 실시간 차트 업데이트
      - TP/SL/Entry 수평선 표시 (FILLED 주문)
  - **하단**: 포지션 상세 테이블 (시간 오름차순, 스크롤)
    - 진입시점 | 진입가 | 진입마진 | 청산시점 | 청산가 | 종료사유(SL/TP1/TP2/본절) | P&L($) | P&L(%) | 잔액

**인터랙션**
- 포지션 행 클릭 시 → `차트` 탭이 활성화되어 있으면, 해당 진입 시점으로 차트 자동 스크롤/이동
- 차트 탭이 아닌 수익 곡선 탭이면 클릭 무시 (이동 없음)

### 6-4. AI 벤치마크 — 주문 입력 (`/benchmark`)
- **모델명 입력**: 기존 모델 autocomplete + 신규 모델 생성
- **가용잔액 표시**: 기존 모델 선택 시 잔액 표시 (신규 모델은 $100)
- **시장 분석**: 텍스트 영역 — 배치 내 전체 주문에 적용되는 시장 관점 기록
- **주문 행 동적 추가/삭제** (2행 레이아웃):
  - 1행: 코인, 방향(long/short), 유형(limit/market), 진입가, TP1, TP2(선택), SL
  - 2행: Confidence(1~5 버튼), 설명
- **TP2 입력 시**: "TP1 도달 시 50% 청산, SL 본절 이동" 안내 표시
- **분석만 제출**: 주문 없이 시장 분석만 제출 가능
- TP/SL 방향 실시간 validation (Long: TP > entry > SL, TP2 > TP1 / Short: 반대)
- 제출 → POST /orders → 모델 상세 페이지로 리다이렉트

### 6-5. AI 벤치마크 — 리더보드 (`/benchmark/models`)
- 모델별 성과 비교 테이블: 순위, 모델명, 잔액, 수익률, 승률, MDD, Profit Factor, 체결률, 주문수
- SSE 구독으로 실시간 업데이트
- 행 클릭 → 모델 상세 페이지

### 6-6. AI 벤치마크 — 모델 상세 (`/benchmark/models/{modelId}`)
- 지표 카드: 잔액, 수익률, 승률, MDD, Profit Factor, 가용잔액
- 잔액 추이 차트 (Equity Curve)
- **배치 그룹별 주문 표시**:
  - 각 배치는 카드로 구분 (배치ID, 시각, 주문 수)
  - 시장 분석이 있으면 배치 헤더에 표시 (음영 박스)
  - 분석만 있는 배치도 표시 ("분석만" 배지)
- 주문 테이블 컬럼: 상태, 유형(LIMIT/MARKET), 코인, 방향, 확신도(dots), 진입가, TP1(+체크), TP2, SL, 마진, P&L, 사유, 설명
- TP1 hit 시 체크마크 표시, partial P&L 툴팁
- SSE 구독으로 실시간 주문 상태 업데이트

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
    side TEXT DEFAULT 'long',
    entry_time TEXT,
    entry_price REAL,
    entry_margin REAL,
    exit_time TEXT,
    exit_price REAL,
    exit_reason TEXT,  -- 'SL', 'TP1', 'TP2', 'BE'
    pnl REAL,
    pnl_pct REAL,
    balance_after REAL,
    tp1_time TEXT
);

-- AI 벤치마크: 모델
CREATE TABLE benchmark_models (
    id TEXT PRIMARY KEY,           -- uuid8
    name TEXT NOT NULL UNIQUE,     -- 모델 이름
    seed REAL NOT NULL DEFAULT 100.0,
    leverage INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 100.0
);

-- AI 벤치마크: 배치 (시장 분석 단위)
CREATE TABLE benchmark_batches (
    id TEXT PRIMARY KEY,              -- batch_id (uuid[:8])
    model_id TEXT NOT NULL REFERENCES benchmark_models(id),
    market_analysis TEXT DEFAULT '',   -- 배치 단위 시장 분석
    created_at TEXT NOT NULL
);

-- AI 벤치마크: 주문 (전체 라이프사이클 관리)
CREATE TABLE benchmark_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL REFERENCES benchmark_models(id),
    batch_id TEXT NOT NULL,        -- benchmark_batches.id 참조
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,            -- 'long' | 'short'
    entry_price REAL NOT NULL,
    tp_price REAL NOT NULL,        -- TP1
    sl_price REAL NOT NULL,
    description TEXT DEFAULT '',
    margin REAL NOT NULL,          -- 투입 마진 (dual TP 시 TP1 후 50%로 감소)
    status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING/FILLED/CLOSED/CANCELLED
    created_at TEXT NOT NULL,
    fill_time TEXT,
    close_time TEXT,
    close_price REAL,
    close_reason TEXT,             -- TP, TP2, SL, SL_BE, TIMEOUT_6H, CANCEL_30M
    pnl REAL,                      -- 최종 P&L (dual TP: tp1_pnl + remaining)
    pnl_pct REAL,
    balance_after REAL,
    order_type TEXT DEFAULT 'limit',   -- 'limit' | 'market'
    confidence INTEGER DEFAULT 3,      -- 1~5
    tp2_price REAL,                    -- 선택적 2차 익절가
    tp1_hit INTEGER DEFAULT 0,         -- TP1 도달 여부 (dual TP)
    tp1_pnl REAL,                      -- TP1 부분 청산 P&L
    source TEXT DEFAULT 'manual'       -- 'manual' | 'ai_trader' | 'telegram'
);
```

---

## 8. 프로젝트 디렉토리 구조

```
profit-lab/
├── backend/
│   ├── main.py                    # FastAPI 앱 + lifespan (3개 백그라운드 태스크)
│   ├── config.py                  # 설정값 (코인 목록, 수수료, 벤치마크 설정 등)
│   ├── Dockerfile
│   ├── data/
│   │   ├── fetcher.py             # ccxt Bybit Futures 데이터 수집
│   │   └── db.py                  # SQLite 연결/쿼리 (백테스트 + 벤치마크)
│   ├── strategy/
│   │   ├── rsi_divergence.py      # RSI 다이버전스 전략 로직
│   │   ├── ema_trend.py           # EMA Trend Following 전략 (Long & Short)
│   │   ├── bb_squeeze.py          # BB Squeeze Breakout 전략 (Long & Short)
│   │   └── risk_filters.py        # 리스크 회피 필터 (전 전략 공통)
│   ├── engine/
│   │   ├── backtester.py          # 백테스트 엔진 (멀티TF 처리)
│   │   ├── benchmark_monitor.py   # 실시간 가격 모니터 (asyncio 백그라운드)
│   │   ├── ai_trader.py           # Claude API 자동 매매 (Calico)
│   │   └── telegram_listener.py   # Telegram 시그널 리스너 (Mirroly Live)
│   └── routers/
│       ├── data.py                # 데이터 수집/캔들/티커 API
│       ├── backtest.py            # 백테스트 실행/조회 API
│       └── benchmark.py           # AI 벤치마크 API + SSE 스트림
├── frontend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── page.tsx                          # 메인 (→ /backtest 리다이렉트)
│   │   ├── backtest/
│   │   │   ├── page.tsx                      # 백테스트 실행 페이지
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # 결과 요약 페이지
│   │   │       └── coins/[symbol]/page.tsx   # 코인 상세 페이지
│   │   ├── benchmark/
│   │   │   ├── page.tsx                      # 주문 입력 페이지
│   │   │   └── models/
│   │   │       ├── page.tsx                  # 리더보드
│   │   │       └── [modelId]/page.tsx        # 모델 상세
│   │   └── layout.tsx
│   ├── components/
│   │   ├── benchmark-chart.tsx       # TradingView 벤치마크 차트 (실시간 업데이트)
│   │   ├── tradingview-chart.tsx     # TradingView 백테스트 차트
│   │   ├── equity-curve.tsx
│   │   ├── resizable-split.tsx
│   │   ├── trade-table.tsx
│   │   └── coin-summary-table.tsx
│   ├── public/tradingview/           # TradingView Charting Library (self-hosted)
│   └── lib/
│       └── api.ts                    # Backend API 호출 함수
├── data/                             # DB, 로그 (gitignore)
│   ├── profit-lab.db
│   ├── ai_trader_logs/
│   └── telegram_logs/
├── docker-compose.yml
├── .env.example
└── SPEC.md
```

---

## 9. 향후 확장 계획 (참고)

- **전략 추가**: 다양한 전략 모듈 플러그인 방식 지원
- **AI 벤치마크 확장**: 미실현 P&L 실시간 표시
- **추가 AI 모델**: 다른 LLM (GPT, Gemini 등) 자동 매매 모델 추가
- **추가 시그널 소스**: 다른 Telegram 채널, Discord, Twitter 등

---

## 10. 검증 방법

1. **백엔드 단위 테스트**: RSI 계산, 다이버전스 감지, SL/TP 체결 로직 각각 검증
2. **수동 검증**: 특정 코인 1~2건의 트레이드를 수작업으로 계산 후 엔진 결과와 대조
3. **프론트엔드**: 백테스트 실행 → 결과 요약 → 코인 상세 → 포지션 로그 전체 흐름 확인
