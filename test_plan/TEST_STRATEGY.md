# Profit-Lab Test Strategy

version: 1.4
app_version: 0.1.0
updated: 2026-03-26

---

## 1. 개요

Profit-Lab 백엔드(Python FastAPI + SQLite) + 프론트엔드(Next.js)의 테스트 전략 문서입니다.
Unit → Integration → E2E → UI/UX 4계층으로 구성하며, 각 계층의 목적·범위·도구를 정의합니다.

---

## 2. 테스트 계층 구조

| 계층 | 목적 | 격리 수준 | 속도 | 도구 |
|------|------|----------|------|------|
| **Unit** | 함수/클래스 단위 로직 검증 | 완전 격리 (mock/in-memory DB) | 빠름 | pytest |
| **Integration** | 모듈 간 협력 + API 엔드포인트 검증 | DB는 in-memory SQLite, 외부 API mock | 중간 | pytest + FastAPI TestClient |
| **E2E (API)** | 실제 사용 시나리오 흐름 검증 | DB in-memory, 외부 API mock | 느림 | pytest + FastAPI TestClient |
| **UI/UX (Stage 1)** | 브라우저 기능 흐름 검증 | 실서버 필요 (백엔드+프론트 실행) | 느림 | Playwright |
| **UI/UX (Stage 2)** | 디자인·UX 품질 AI 검증 | 실서버 + ANTHROPIC_API_KEY 필요 | 느림 | Claude Vision |

---

## 3. 테스트 파일 목록

### 3-A. Unit Tests

| 파일 | 대상 모듈 | TC 수 | 주요 TC |
|------|----------|------|---------|
| `tests/test_strategy.py` | `strategy.rsi_divergence` | 17 | 시그널 탐지, 4-필터 시스템, 캔들 패턴 |
| `tests/test_strategy_ema.py` | `strategy.ema_trend` | 16 | EMA 크로스오버 진입/청산 시뮬레이션 |
| `tests/test_strategy_bb.py` | `strategy.bb_squeeze` | 15 | BB Squeeze 롱/숏 진입, 트레일링 스탑 |
| `tests/test_risk_filters.py` | `strategy.risk_filters` | 16 | EMA Gap, ADX, BTC Guard, 스파이크 쿨다운, BB 확장 |
| `tests/test_backtester.py` | `engine.backtester` | 11 | 시뮬레이션 결과 필드, 수익률 계산 |
| `tests/test_db.py` | `data.db` | 12 | candle/run/summary/trade CRUD |
| `tests/test_benchmark_monitor.py` | `engine.benchmark_monitor` | 35 | PnL 계산, PENDING→FILLED, FILLED→CLOSED, 주문 복구 |
| `tests/test_ai_trader.py` | `engine.ai_trader` | 17 | 프롬프트 빌더, Claude API 파싱, 주문 검증/제출 |
| `tests/test_telegram_listener.py` | `engine.telegram_listener` | 27 | 시그널 파서, 포지션 진입/청산 |

### 3-B. Integration Tests

| 파일 | 대상 | TC 수 | 주요 TC |
|------|------|------|---------|
| `tests/test_api.py` | Backtest API | 13 | health, candles, backtest run/summary/coins/trades |
| `tests/test_benchmark_api.py` | Benchmark API (기존) | 33 | 주문 제출, 모델 관리, 배치 관리, TP2, confidence |
| `tests/test_benchmark_new.py` | Benchmark API (신규) | 24 | 모델 rename/delete, 주문 patch, 배치 patch/delete, source 필드, TP2 검증, 실시간 가격 INVALID |
| `tests/test_data_api_new.py` | Data API (신규) | 14 | ticker, symbols, 5m/15m/30m/4h/1D 리샘플링, 전략별 지표 |
| `tests/test_integration_backtest.py` | Backtest 전체 파이프라인 | 9 | 다중 전략 통합 흐름, SSE 스트림 |

### 3-C. E2E Tests (API 레벨)

| 파일 | TC 수 | 시나리오 |
|------|------|---------|
| `tests/test_e2e_backtest.py` | 10 | 백테스트 전체 여정 (3전략, 일관성, 독립성) |
| `tests/test_e2e_benchmark.py` | 10 | 벤치마크 주문 생애주기, 리더보드, 모델 관리 |

### 3-D. UI/UX Tests (Playwright + Claude Vision) ← v1.3 신규

#### Stage 1 — Playwright 기능 흐름 (실서버 필요)

| 파일 | TC 수 | 검증 내용 |
|------|------|---------|
| `tests/e2e/test_journey_backtest.py` | 27 | 페이지 로드, 전략 선택, 날짜 입력, 코인 토글, 실행 버튼, 홈 페이지 |
| `tests/e2e/test_journey_benchmark.py` | 22 | 주문 입력 UI, 모델명 입력, 주문 카드 조작, 리더보드 |
| `tests/e2e/test_journey_error.py` | 14 | 페이지 접근성, 입력 유효성 에러, UX 품질(오버플로우·콘솔에러·푸터) |

#### Stage 2 — Claude Vision AI 분석 (스크린샷 → AI 판단)

| 파일 | 목적 |
|------|------|
| `tests/e2e/ai_visual_check.py` | 스크린샷 캡처 + Claude Vision으로 디자인·UX 품질 분석 |
| `tests/e2e/run_ui_test.sh` | Stage 1 + Stage 2 통합 실행 스크립트 |
| `tests/e2e/screenshots/` | 캡처된 스크린샷 저장 위치 |
| `tests/e2e/visual_report.md` | AI 분석 결과 보고서 |

**분석 대상 페이지**: 홈(`/`), 백테스트(`/backtest`), 벤치마크(`/benchmark`), 리더보드(`/benchmark/models`)

**AI 체크 항목** (페이지당 5개):
- 핵심 UI 요소 가시성
- 레이아웃 정렬·깨짐 여부
- 텍스트 잘림·겹침 여부
- 디자인 시스템 일관성 (픽셀/레트로 테마)
- 빈 상태(empty state) 처리

**총 TC: 289 (백엔드) + 63 (UI/UX Playwright) = 352**

---

## 4. UI/UX 테스트 실행 방법

### 사전 조건

```bash
# 1. 백엔드 실행
cd backend && uvicorn main:app --port 8000

# 2. 프론트엔드 실행 (별도 터미널)
cd frontend && npm run dev   # → http://localhost:3001
```

### Stage 1: Playwright 기능 흐름

```bash
cd backend
source venv/bin/activate

# 전체 UI/UX TC 실행
pytest tests/e2e/ -v --screenshot=only-on-failure

# 특정 파일만
pytest tests/e2e/test_journey_backtest.py -v
pytest tests/e2e/test_journey_benchmark.py -v
pytest tests/e2e/test_journey_error.py -v

# 스크린샷 항상 저장
pytest tests/e2e/ -v --screenshot=on
```

### Stage 2: AI Visual Check

```bash
# ANTHROPIC_API_KEY 설정 후 실행
export ANTHROPIC_API_KEY=sk-ant-...
python tests/e2e/ai_visual_check.py

# 특정 페이지만
python tests/e2e/ai_visual_check.py --pages home backtest

# API 없이 스크린샷만 저장
python tests/e2e/ai_visual_check.py --save-only
```

### 통합 실행 (권장)

```bash
# Stage 1 + Stage 2 한 번에
./tests/e2e/run_ui_test.sh

# Stage 1만
./tests/e2e/run_ui_test.sh --stage1

# 스크린샷만 (API 불필요)
./tests/e2e/run_ui_test.sh --screenshot
```

---

## 5. 픽스처 및 헬퍼

| 항목 | 위치 | 설명 |
|------|------|------|
| 공통 픽스처 | `tests/conftest.py` | `in_memory_db`, `benchmark_db`, `strategy_params`, `benchmark_params` |
| E2E 픽스처 | `tests/e2e/conftest.py` | 전체 스택 TestClient |
| 헬퍼 함수 | `tests/helpers.py` | `make_1h_candles`, `make_1m_candles`, `make_divergence_scenario` |
| 픽스처 데이터 | `tests/fixtures/v1/` | `strategy_params.json`, `benchmark_params.json`, `manifest.json` |

---

## 6. 테스트 마커

```ini
# pytest.ini
markers =
  unit: Unit test (no external dependencies)
  integration: Integration test (TestClient + in-memory DB)
  e2e: End-to-end test (full user journey)
  slow: Tests that take > 5 seconds
```

실행 예시:
```bash
# 백엔드 전체 (서버 불필요)
pytest tests/ -v

# UI/UX만 (서버 필요)
pytest tests/e2e/ -v

# 빠른 검증 (Unit + Integration)
pytest tests/ -m "unit or integration" -v
```

---

## 7. Mock 정책

| 대상 | Mock 방법 | 이유 |
|------|----------|------|
| Bybit API (`get_exchange`) | `patch("routers.backtest.get_exchange")` + `patch("routers.data.get_exchange")` + `patch("routers.benchmark.get_exchange")` | 네트워크 의존성 제거 |
| DB 연결 | `patch("data.db.get_connection", factory)` | 실제 DB 파일 오염 방지 |
| AI Trader | `patch("engine.ai_trader.ai_trader_loop")` | Anthropic API 키 없는 환경 |
| WebSocket broadcast | `patch("engine.benchmark_monitor._broadcast")` | 비동기 이벤트 격리 |
| OHLCV fetch | `patch("routers.backtest.fetch_ohlcv", return_value=[])` | 실제 거래소 데이터 미사용 |
| UI/UX 테스트 | Mock 없음 — 실서버 사용 | 실제 브라우저 렌더링 검증 |

---

## 8. 결과 보고

### 8-A. 자동 생성 보고서 (pytest 실행 시)

테스트 실행 시 `conftest.py`의 훅이 **3가지 형식을 동시에** 자동 생성합니다.

| 형식 | 파일명 패턴 | 위치 | 용도 |
|------|-----------|------|------|
| **Markdown** | `TEST_RESULT_{YYYYmmdd_HHMMSS}.md` | `backend/test-results/` | 문서화, Git 커밋 |
| **HTML** | `TEST_RESULT_{YYYYmmdd_HHMMSS}.html` | `backend/test-results/` | 브라우저 시각 검토 |
| **CSV** | `TEST_RESULT_{YYYYmmdd_HHMMSS}.csv` | `backend/test-results/` | Google Sheets / Excel 분석 |

> 타임스탬프가 동일하므로 세 파일이 한 세트를 이룹니다.

#### CSV → 스프레드시트 가져오기

| 도구 | 방법 |
|------|------|
| Google Sheets | 파일 → 가져오기 → UTF-8 CSV 선택 |
| Excel | 데이터 → 텍스트/CSV 가져오기 → UTF-8 BOM 자동 인식 |

CSV 컬럼: `실행일시`, `파일`, `클래스`, `테스트명`, `결과`, `비고`

#### HTML 보고서 구성

- 상단 요약: 전체 결과 배지 (PASSED / FAILED), 소요 시간, 총 TC 수
- 통계 카드: PASSED / FAILED / SKIPPED 건수
- 파일별 집계 테이블
- 전체 TC 목록 테이블 (색상 코딩)
- 실패 상세 섹션 (FAIL 건 존재 시)
- 하단 스프레드시트 내보내기 안내

### 8-B. pytest-html 기본 보고서

| 보고서 | 위치 | 생성 방식 |
|--------|------|----------|
| HTML 보고서 (pytest-html) | `backend/reports/latest.html` | `addopts --html` 자동 생성 |

### 8-C. UI/UX 보고서

| 보고서 | 위치 | 생성 방식 |
|--------|------|----------|
| UI 스크린샷 | `backend/tests/e2e/screenshots/` | `ai_visual_check.py` 자동 저장 |
| AI 분석 보고서 | `backend/tests/e2e/visual_report.md` | `ai_visual_check.py` 자동 생성 |
| Playwright 로그 | `backend/test-results/ui-ux/playwright_{ts}.log` | `run_ui_test.sh` 저장 |

### 8-D. 수동 보관 보고서

| 보고서 | 위치 |
|--------|------|
| test_plan 결과 아카이브 | `test_plan/results/` |

---

## 9. 버전 관리

VERSIONS.md 참조. 앱 버전 변경 시 fixture 버전 + test suite 버전 동반 업데이트.

---

## 10. 알려진 이슈

| 이슈 | 파일 | 상태 |
|------|------|------|
| `conftest._BENCHMARK_SCHEMA` — `source` 컬럼 누락 | `tests/conftest.py` | ✅ 수정됨 |
| `test_api.py` — `routers.backtest.get_exchange` mock 누락 | `tests/test_api.py` | ✅ 수정됨 |
| `test_benchmark_monitor.py::test_skip_check_within_60s` — 기대값 오류 | `tests/test_benchmark_monitor.py` | ✅ 수정됨 |
| `test_benchmark_new.py` / `test_data_api_new.py` — TC_LIST 미반영 | `test_plan/TC_LIST.md` | ✅ v1.2에서 반영 |
| Journey E2E (Playwright) — 실서버 없이 실행 불가 | `tests/e2e/` | ✅ v1.3에서 실행 가이드 추가 |
| AI Visual Check — `ANTHROPIC_API_KEY` 없으면 Stage 2 실행 불가 | `tests/e2e/ai_visual_check.py` | ℹ️ `--save-only` 모드로 우회 가능 |
