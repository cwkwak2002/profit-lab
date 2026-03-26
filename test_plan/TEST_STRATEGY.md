# Profit-Lab QA Test Strategy

```
document: TEST_STRATEGY.md
version: 2.0
app_version: 0.1.0
owner: QA Team
updated: 2026-03-26
```

---

## 목차

1. [문서 목적 및 범위](#1-문서-목적-및-범위)
2. [QA 환경 구조](#2-qa-환경-구조)
3. [테스트 전략 및 방법론](#3-테스트-전략-및-방법론)
4. [테스트 계층 구조](#4-테스트-계층-구조)
5. [테스트 도구](#5-테스트-도구)
6. [테스트 파일 목록](#6-테스트-파일-목록)
7. [실행 방법](#7-실행-방법)
8. [결과 판단 기준](#8-결과-판단-기준)
9. [결과 기록 및 보고서 도출](#9-결과-기록-및-보고서-도출)
10. [시각화](#10-시각화)
11. [버전 관리 정책](#11-버전-관리-정책)
12. [픽스처 및 헬퍼](#12-픽스처-및-헬퍼)
13. [Mock 정책](#13-mock-정책)
14. [알려진 이슈](#14-알려진-이슈)

---

## 1. 문서 목적 및 범위

이 문서는 Profit-Lab 서비스에 대한 **QA 팀의 테스트 전략 전반**을 기술합니다.
테스트 전략, 방법론, 도구, 실행 절차, 결과 판단 기준, 결과 기록, 보고서 도출, 시각화까지
QA 활동의 처음부터 끝까지를 담고 있으며, 사람이든 AI든 이 문서 하나로
QA 환경 전체를 파악할 수 있도록 작성되었습니다.

### 범위

| 대상 | 포함 여부 |
|------|---------|
| 백엔드 API (FastAPI + SQLite) | ✅ |
| 프론트엔드 UI (Next.js) | ✅ |
| 개발자 단위 테스트 코드 재활용 | ✅ (읽기 전용, 심볼릭 링크) |
| CI/CD 파이프라인 자동화 | 향후 추가 예정 |
| 성능·부하 테스트 | 향후 추가 예정 |

### QA / 개발자 테스트 분리 원칙

```
backend/tests/   ← 개발자 작성·관리. git pull 로 변경됨. QA 는 수정하지 않음.
test_plan/       ← QA 팀 작성·관리. 개발자 코드 변경에 영향받지 않음.
```

- QA는 `test_plan/` 폴더만 커밋한다.
- `backend/` 코드가 바뀌어도 `test_plan/` 구조·보고서·도구는 영향을 받지 않는다.
- 앱 버전은 `test_plan/APP_VERSION`에서 독립적으로 관리한다.

---

## 2. QA 환경 구조

```
test_plan/
├── APP_VERSION                  # QA 팀이 관리하는 앱 버전 (예: 0.1.0)
├── TEST_STRATEGY.md             # 이 문서
├── TC_LIST.md                   # 전체 TC 목록 (ID, 검증 내용, 예상 결과)
├── pytest.ini                   # QA 전용 pytest 설정
├── conftest.py                  # QA 보고서 훅 (MD + HTML + CSV 자동 생성)
├── run_visual_check.sh          # 스크린샷·AI 분석 실행 바로가기
│
├── tests/                       # pytest 수집 대상 (testpaths = tests)
│   ├── test_*.py → symlink      # 개발자 TC 재사용 (읽기 전용)
│   ├── fixtures/ → symlink      # 개발자 픽스처 데이터 재사용
│   ├── helpers.py → symlink     # 개발자 헬퍼 함수 재사용
│   └── e2e/                     # QA 전용 UI/UX 테스트 (실제 디렉터리)
│       ├── conftest.py          # Playwright 픽스처
│       ├── test_journey_*.py    # QA 작성 Journey TC
│       ├── ai_visual_check.py   # 스크린샷 캡처 + Claude Vision 분석
│       └── run_ui_test.sh       # UI/UX 통합 실행 스크립트
│
└── results/                     # 모든 테스트 결과물
    ├── latest.html              # pytest-html 최신 보고서
    ├── test-runs/               # 자동화 테스트 결과
    │   └── v{version}/
    │       └── {YYYYMMDD_HHMMSS}/
    │           ├── TEST_RESULT.md
    │           ├── TEST_RESULT.html
    │           └── TEST_RESULT.csv
    └── screenshots/             # UI/UX 시각화 결과
        └── v{version}/
            └── {YYYYMMDD_HHMMSS}/
                ├── home.png
                ├── backtest.png
                ├── benchmark.png
                ├── leaderboard.png
                └── visual_report.md
```

---

## 3. 테스트 전략 및 방법론

### 3-1. 기본 전략

**리스크 기반 테스트(Risk-Based Testing)** 를 기반으로 하되,
커버리지보다 **비즈니스 핵심 흐름 검증**을 우선합니다.

| 우선순위 | 대상 | 근거 |
|---------|------|------|
| P1 (최고) | 주문 제출·청산·PnL 계산 | 금전 손실 직결 |
| P1 | 백테스트 전략 시뮬레이션 결과 | 의사결정 근거 데이터 |
| P2 | API 엔드포인트 응답 형식 | 프론트 연동 안정성 |
| P2 | UI 핵심 흐름 (입력→제출→결과) | 사용자 경험 |
| P3 | 디자인 시스템 일관성 | 브랜드 품질 |
| P3 | 에러 처리·빈 상태 UX | 서비스 완성도 |

### 3-2. 테스트 설계 원칙

- **독립성**: 각 TC는 다른 TC에 의존하지 않는다. 순서 무관하게 단독 실행 가능해야 한다.
- **반복 가능성**: 동일 입력에 동일 결과. 시간·외부 API에 의존하는 경우 Mock 처리한다.
- **최소 범위**: TC 하나는 한 가지만 검증한다. 복합 검증은 E2E 계층에서만 허용한다.
- **예상 결과 명시**: 모든 TC는 `TC_LIST.md`에 `예상 결과` 컬럼이 작성되어야 한다.

### 3-3. 커버리지 목표

| 계층 | 목표 커버리지 | 현재 TC 수 |
|------|------------|-----------|
| Unit | 핵심 함수 90% 이상 | 149 |
| Integration | 전체 API 엔드포인트 100% | 93 |
| E2E (API) | 주요 사용자 시나리오 100% | 20 |
| UI/UX Journey | 핵심 페이지 흐름 100% | 63 |
| AI Visual | 전체 공개 페이지 100% | 4 페이지 |

---

## 4. 테스트 계층 구조

```
                    [UI/UX Stage 2]
                    Claude Vision AI 분석
                         ↑
                    [UI/UX Stage 1]
                    Playwright 브라우저 자동화
                         ↑
                    [E2E (API)]
                    전체 사용자 시나리오
                         ↑
                    [Integration]
                    API ↔ DB 연동
                         ↑
                    [Unit]
                    함수·클래스 단위
```

| 계층 | 목적 | 격리 수준 | 서버 필요 | 도구 |
|------|------|---------|---------|------|
| **Unit** | 함수·클래스 로직 검증 | 완전 격리 (in-memory DB) | 불필요 | pytest |
| **Integration** | API ↔ DB 연동 검증 | in-memory DB, 외부 API Mock | 불필요 | pytest + FastAPI TestClient |
| **E2E (API)** | 전체 사용자 시나리오 | in-memory DB, 외부 API Mock | 불필요 | pytest + FastAPI TestClient |
| **UI/UX Stage 1** | 브라우저 기능 흐름 | 실서버 사용 | **필요** | Playwright |
| **UI/UX Stage 2** | 디자인·UX AI 품질 분석 | 실서버 + API Key | **필요** | Claude Vision |

---

## 5. 테스트 도구

| 도구 | 버전 | 용도 |
|------|------|------|
| **pytest** | ≥7.0 | 테스트 실행 프레임워크 |
| **pytest-html** | ≥3.0 | HTML 보고서 자동 생성 |
| **FastAPI TestClient** | (fastapi 내장) | API 계층 테스트 |
| **Playwright** | ≥1.40 | 브라우저 자동화 (UI/UX Stage 1) |
| **pytest-playwright** | ≥0.4 | Playwright pytest 플러그인 |
| **Anthropic SDK** | ≥0.20 | Claude Vision AI 분석 (UI/UX Stage 2) |
| **SQLite (in-memory)** | Python 내장 | 테스트용 격리 DB |

### 설치

```bash
cd backend
source venv/bin/activate
pip install pytest pytest-html playwright pytest-playwright anthropic
playwright install chromium
```

---

## 6. 테스트 파일 목록

### 6-A. Unit Tests

| 파일 | 대상 모듈 | TC 수 | 주요 검증 |
|------|----------|------|---------|
| `tests/test_strategy.py` | `strategy.rsi_divergence` | 17 | 시그널 탐지, 4-필터 시스템, 캔들 패턴 |
| `tests/test_strategy_ema.py` | `strategy.ema_trend` | 16 | EMA 크로스오버 진입·청산 |
| `tests/test_strategy_bb.py` | `strategy.bb_squeeze` | 15 | BB Squeeze 롱/숏 진입, 트레일링 스탑 |
| `tests/test_risk_filters.py` | `strategy.risk_filters` | 16 | EMA Gap, ADX, BTC Guard, 스파이크 쿨다운 |
| `tests/test_backtester.py` | `engine.backtester` | 11 | 시뮬레이션 결과 필드, 수익률 계산 |
| `tests/test_db.py` | `data.db` | 12 | candle/run/summary/trade CRUD |
| `tests/test_benchmark_monitor.py` | `engine.benchmark_monitor` | 35 | PnL 계산, 주문 상태 전이, 복구 |
| `tests/test_ai_trader.py` | `engine.ai_trader` | 17 | 프롬프트 빌더, Claude API 파싱, 주문 검증 |
| `tests/test_telegram_listener.py` | `engine.telegram_listener` | 27 | 시그널 파서, 포지션 진입·청산 |

### 6-B. Integration Tests

| 파일 | 대상 | TC 수 | 주요 검증 |
|------|------|------|---------|
| `tests/test_api.py` | Backtest API | 13 | health, candles, backtest run/summary/coins/trades |
| `tests/test_benchmark_api.py` | Benchmark API | 33 | 주문 제출, 모델 관리, 배치 관리, TP2, confidence |
| `tests/test_benchmark_new.py` | Benchmark API (신규) | 24 | 모델 rename/delete, 주문 patch, 배치 patch/delete |
| `tests/test_data_api_new.py` | Data API | 14 | ticker, symbols, 리샘플링, 전략별 지표 |
| `tests/test_integration_backtest.py` | Backtest 파이프라인 | 9 | 다중 전략 통합 흐름, SSE 스트림 |

### 6-C. E2E Tests (API 레벨)

| 파일 | TC 수 | 주요 시나리오 |
|------|------|------------|
| `tests/test_e2e_backtest.py` | 10 | 백테스트 전체 여정 (3전략, 일관성, 독립성) |
| `tests/test_e2e_benchmark.py` | 10 | 벤치마크 주문 생애주기, 리더보드, 모델 관리 |

### 6-D. UI/UX Tests — Stage 1 (Playwright)

| 파일 | TC 수 | 주요 검증 |
|------|------|---------|
| `tests/e2e/test_journey_backtest.py` | 27 | 페이지 로드, 전략 선택, 날짜 입력, 코인 토글, 실행 버튼 |
| `tests/e2e/test_journey_benchmark.py` | 22 | 주문 입력 UI, 모델명 입력, 주문 카드 조작, 리더보드 |
| `tests/e2e/test_journey_error.py` | 14 | 페이지 접근성, 입력 유효성 에러, UX 품질 |

### 6-E. UI/UX Tests — Stage 2 (Claude Vision)

| 파일 | 역할 |
|------|------|
| `tests/e2e/ai_visual_check.py` | 스크린샷 캡처 + Claude Vision 디자인·UX 분석 |
| `tests/e2e/run_ui_test.sh` | Stage 1 + Stage 2 통합 실행 스크립트 |

**분석 대상 페이지**: 홈(`/`), 백테스트(`/backtest`), 벤치마크(`/benchmark`), 리더보드(`/benchmark/models`)

**AI 체크 항목** (페이지당 5개 + 공통 4개):
- 핵심 UI 요소 가시성
- 레이아웃 정렬·깨짐 여부
- 텍스트 잘림·겹침 여부
- 디자인 시스템 일관성 (픽셀/레트로 테마)
- 빈 상태(empty state) 처리

**총 TC: 289 (백엔드) + 63 (UI/UX Playwright) = 352**

---

## 7. 실행 방법

### 7-1. 사전 조건

```bash
# venv 활성화 (backend/venv 기준)
cd profit-lab/backend
source venv/bin/activate
```

UI/UX 테스트는 추가로 서버 실행 필요:

```bash
# 터미널 1 — 백엔드
cd backend && uvicorn main:app --port 8000

# 터미널 2 — 프론트엔드
cd frontend && npm run dev   # → http://localhost:3001
```

### 7-2. 백엔드 전체 테스트 (서버 불필요)

```bash
cd test_plan

# 전체 실행 (Unit + Integration + E2E)
python -m pytest tests/ -v

# 마커별 실행
python -m pytest tests/ -m unit -v
python -m pytest tests/ -m integration -v
python -m pytest tests/ -m e2e -v

# 특정 파일만
python -m pytest tests/test_benchmark_monitor.py -v
```

### 7-3. UI/UX 테스트 — Stage 1 (Playwright)

```bash
cd test_plan

# 전체 Journey TC
python -m pytest tests/e2e/ -v --screenshot=only-on-failure

# 특정 Journey 파일
python -m pytest tests/e2e/test_journey_backtest.py -v
python -m pytest tests/e2e/test_journey_error.py -v
```

### 7-4. UI/UX 테스트 — Stage 2 (스크린샷 + AI 분석)

```bash
cd test_plan

# 스크린샷만 저장 (API Key 불필요)
python tests/e2e/ai_visual_check.py --save-only

# 특정 페이지만
python tests/e2e/ai_visual_check.py --pages home backtest --save-only

# AI 분석 포함 (ANTHROPIC_API_KEY 필요)
export ANTHROPIC_API_KEY=sk-ant-...
python tests/e2e/ai_visual_check.py
```

### 7-5. 통합 실행 (권장)

```bash
cd test_plan

# 스크린샷만
./run_visual_check.sh --screenshot

# Stage 1 (Playwright) + Stage 2 (스크린샷)
./run_visual_check.sh

# Stage 1만
./run_visual_check.sh --stage1

# Stage 2 AI 분석 포함
ANTHROPIC_API_KEY=sk-ant-... ./run_visual_check.sh --stage2
```

---

## 8. 결과 판단 기준

### 8-1. 백엔드 TC 합격 기준

| 상태 | 기준 | 조치 |
|------|------|------|
| **PASS** | assert 조건 모두 충족, 예외 없음 | 기록 후 다음 단계 진행 |
| **FAIL** | assert 실패 또는 예외 발생 | 즉시 결함 리포트 작성, 재실행 전 원인 파악 |
| **SKIP** | `@pytest.mark.skip` 또는 조건부 skip | skip 사유 TC_LIST.md에 기록 |

**릴리스 게이트**: FAIL이 0건이어야 릴리스 승인. SKIP은 사유가 문서화되어 있을 경우 허용.

### 8-2. UI/UX Stage 1 (Playwright) 합격 기준

| 항목 | 합격 조건 |
|------|---------|
| 페이지 접근성 | 모든 주요 페이지 정상 로드 (`networkidle` 또는 `load` 완료) |
| 네비게이션 | `nav` 또는 `header` 요소 존재 |
| 수평 오버플로우 | `scrollWidth ≤ clientWidth + 5px` |
| 콘솔 에러 | `TypeError`, `ReferenceError` 0건 |
| 스택트레이스 노출 | `Traceback`, `TypeError` 등 UI 미노출 |

### 8-3. UI/UX Stage 2 (Claude Vision) 판단 기준

Claude Vision이 각 체크 항목을 아래 기준으로 평가합니다:

| 평가 | 의미 | 조치 |
|------|------|------|
| ✅ PASS | 정상. 기준 충족 | 기록만 |
| ⚠️ WARN | 개선 권장. 기능 동작은 정상 | 다음 스프린트 개선 검토 |
| ❌ FAIL | 명백한 결함. 사용자 경험 저해 | 즉시 개발팀 피드백 |

**AI 분석 점수 기준**:

| 점수 | 판정 |
|------|------|
| 90점 이상 | ✅ 릴리스 적합 |
| 75~89점 | ⚠️ 조건부 릴리스 (WARN 항목 개선 계획 필요) |
| 74점 이하 | ❌ 릴리스 보류 (FAIL 항목 수정 후 재검토) |

---

## 9. 결과 기록 및 보고서 도출

### 9-1. 자동 생성 보고서 (pytest 실행 시)

`test_plan/conftest.py`의 훅이 pytest 세션 종료 시 **3가지 형식을 동시에** 자동 생성합니다.

```
결과 저장 위치: test_plan/results/test-runs/v{APP_VERSION}/{YYYYMMDD_HHMMSS}/
```

| 형식 | 파일명 | 용도 |
|------|--------|------|
| **Markdown** | `TEST_RESULT.md` | 문서화, Git 커밋, PR 첨부 |
| **HTML** | `TEST_RESULT.html` | 브라우저 시각 검토, 색상 코딩 |
| **CSV** | `TEST_RESULT.csv` | Google Sheets / Excel 분석 |

각 실행마다 타임스탬프 폴더가 새로 생성되므로 **모든 실행 이력이 누적 보관**됩니다.

### 9-2. 보고서 컬럼 구성

**CSV 컬럼**: `실행일시`, `파일`, `클래스`, `테스트명`, `결과`, `비고`

**HTML 보고서 구성**:
- 상단: 최종 결과 배지 (✅ PASSED / ❌ FAILED), 실행 일시·소요 시간·실행 주체
- 요약 카드: PASSED / FAILED / SKIPPED 건수
- 파일별 집계 테이블
- 전체 TC 목록 (색상 코딩: 초록/빨강/노랑)
- FAIL 상세 섹션 (실패 건 존재 시)
- 하단: 스프레드시트 가져오기 안내

### 9-3. CSV → 스프레드시트 가져오기

| 도구 | 방법 |
|------|------|
| Google Sheets | 파일 → 가져오기 → UTF-8 CSV 선택 |
| Excel | 데이터 → 텍스트/CSV 가져오기 → UTF-8 BOM 자동 인식 |

### 9-4. pytest-html 보고서

pytest 실행 시 `--html=results/latest.html` 옵션으로 `test_plan/results/latest.html`에
항상 최신 보고서가 덮어쓰기됩니다 (`pytest.ini`에 설정됨).

### 9-5. UI/UX 보고서

```
결과 저장 위치: test_plan/results/screenshots/v{APP_VERSION}/{YYYYMMDD_HHMMSS}/
```

| 파일 | 내용 |
|------|------|
| `{page}.png` | 전체 페이지 스크린샷 (1280×900 기준) |
| `visual_report.md` | Claude Vision AI 분석 결과 (체크리스트 평가·점수·요약) |

---

## 10. 시각화

### 10-1. 테스트 결과 시각화 (HTML 보고서)

`TEST_RESULT.html` 파일을 브라우저에서 열면 다음을 확인할 수 있습니다:

- **색상 코딩**: PASS(초록), FAIL(빨강 배경), SKIP(노랑 배경)
- **요약 카드**: 숫자로 표시된 PASS/FAIL/SKIP 건수
- **파일별 집계**: 어느 모듈에서 실패가 집중되는지 파악
- **FAIL 상세**: 실패 원인 메시지 인라인 표시

### 10-2. 스크린샷 시각화

`results/screenshots/v{version}/{timestamp}/` 폴더의 PNG 파일로
각 페이지의 실제 렌더링 상태를 확인합니다.

**폴더 구조 활용**:
- 버전별 비교: `v0.1.0/` vs `v0.2.0/` 폴더를 나란히 열어 UI 변경사항 추적
- 시점별 비교: 같은 버전 내 여러 타임스탬프 폴더로 배포 전후 비교

### 10-3. AI 분석 보고서 시각화 (visual_report.md)

`visual_report.md`는 페이지별로 아래 항목을 포함합니다:

```
## {PAGE} 페이지
스크린샷: {page}.png
분석 시각: {ISO timestamp}

1. 체크리스트 평가
   ✅/⚠️/❌ + 한 줄 설명

2. 발견된 문제점

3. 전체 점수 (100점 만점)

4. 한 줄 요약
```

### 10-4. 이력 조회

```bash
# 전체 실행 이력 목록
ls test_plan/results/test-runs/v0.1.0/

# 특정 실행 결과 열기
open test_plan/results/test-runs/v0.1.0/20260326_152548/TEST_RESULT.html

# 최신 스크린샷 폴더
ls test_plan/results/screenshots/v0.1.0/ | sort | tail -1
```

---

## 11. 버전 관리 정책

### 11-1. 앱 버전 (`APP_VERSION`)

`test_plan/APP_VERSION` 파일에 현재 테스트 대상 앱 버전을 기록합니다.

```
0.1.0
```

- 앱 버전이 올라가면 QA 팀이 이 파일을 직접 수정합니다.
- `backend/main.py`의 버전과 독립적으로 관리됩니다.
- 결과 폴더 경로에 버전이 포함(`v0.1.0/`)되므로 버전별 결과가 자동 분리됩니다.

### 11-2. 문서 버전

이 문서(`TEST_STRATEGY.md`) 상단의 `version` 필드를 직접 수정합니다.

| 변경 유형 | 버전 규칙 | 예시 |
|---------|---------|------|
| TC 추가·삭제, 전략 변경 | Minor 버전 +1 | 2.0 → 2.1 |
| 계층 구조·도구 변경 | Major 버전 +1 | 2.0 → 3.0 |
| 오탈자·설명 수정 | Patch 버전 | 2.0 → 2.0.1 |

### 11-3. 결과 이력 보관 정책

- 결과 파일은 삭제하지 않고 누적 보관합니다.
- `results/test-runs/` 및 `results/screenshots/`는 `.gitignore` 적용 여부를 팀에서 결정합니다.
  - Git에 포함할 경우: 이력 추적 가능, 저장소 용량 증가
  - `.gitignore`에 추가할 경우: 로컬에만 보관, 저장소 경량 유지

---

## 12. 픽스처 및 헬퍼

| 항목 | 위치 | 설명 |
|------|------|------|
| QA 공통 픽스처 | `test_plan/conftest.py` | `in_memory_db`, `benchmark_db`, `in_memory_db_with_benchmark` |
| E2E 픽스처 | `tests/e2e/conftest.py` | Playwright `page` 픽스처 |
| 헬퍼 함수 | `tests/helpers.py` (symlink) | `make_1h_candles`, `make_1m_candles`, `make_divergence_scenario` |
| 픽스처 데이터 | `tests/fixtures/v1/` (symlink) | `strategy_params.json`, `benchmark_params.json` |

---

## 13. Mock 정책

| 대상 | Mock 방법 | 이유 |
|------|----------|------|
| Bybit API (`get_exchange`) | `patch("routers.*.get_exchange")` | 네트워크 의존성 제거 |
| DB 연결 | `patch("data.db.get_connection", factory)` | 실제 DB 파일 오염 방지 |
| AI Trader | `patch("engine.ai_trader.ai_trader_loop")` | Anthropic API 키 불필요 |
| WebSocket broadcast | `patch("engine.benchmark_monitor._broadcast")` | 비동기 이벤트 격리 |
| OHLCV fetch | `patch("routers.backtest.fetch_ohlcv", return_value=[])` | 실거래소 데이터 미사용 |
| UI/UX 테스트 | **Mock 없음** — 실서버 사용 | 실제 브라우저 렌더링 검증 목적 |

---

## 14. 알려진 이슈

| 이슈 | 파일 | 상태 |
|------|------|------|
| `conftest._BENCHMARK_SCHEMA` — `source` 컬럼 누락 | `tests/conftest.py` | ✅ 수정됨 |
| `test_api.py` — `routers.backtest.get_exchange` mock 누락 | `tests/test_api.py` | ✅ 수정됨 |
| `test_benchmark_monitor.py::test_skip_check_within_60s` — 기대값 오류 | `tests/test_benchmark_monitor.py` | ✅ 수정됨 |
| Journey E2E — `leaderboard` 페이지 `networkidle` 타임아웃 | `tests/e2e/ai_visual_check.py` | ✅ `wait_until="load"` 로 우회 |
| AI Visual Check — `ANTHROPIC_API_KEY` 없으면 Stage 2 실행 불가 | `tests/e2e/ai_visual_check.py` | ℹ️ `--save-only` 모드로 우회 |
| `test_plan/tests/e2e` 심볼릭 링크 → 실제 디렉터리로 전환 | `test_plan/tests/e2e/` | ✅ v2.0에서 완료 |
