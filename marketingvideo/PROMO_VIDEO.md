# ProfitLab 홍보 영상 제작 기록

## 영상 목록

| 파일 | 비율 | 해상도 | 길이 | 용도 |
|------|------|--------|------|------|
| `profitlab-promo-v1-4x5.mp4` | 4:5 | 1080×1350 | ~26초 (800프레임) | Instagram 피드 (권장) |
| — | 9:16 | 1080×1920 | ~26초 (800프레임) | Reels / TikTok / Shorts |

> **현재 권장 비율**: 4:5 (1080×1350) — 세로형이지만 덜 길어서 피드에 적합

---

## 1. 영상 컨셉

### 브랜드 방향
ProfitLab은 AI가 시장을 분석하고 최적 타이밍에 자동 실행하는 스마트 트레이딩 플랫폼이다.
영상은 **픽셀 레트로 + 사이버펑크** 미감으로 기술력과 신뢰감을 전달한다.

### 비주얼 컨셉
- **컬러**: `#0a0a1a` 딥 다크 배경 + `#ffe000` 노란 포인트 + `#00eeff` 사이안 액센트
- **타이포**: Press Start 2P (픽셀 헤드라인) + JetBrains Mono (수치/본문)
- **배경 효과**: 픽셀 그리드 오버레이 + 스캔라인 + 대기 glow (상단 노란/하단 파란)
- **분위기**: 픽셀 아트 레트로 게임 + 트레이딩 터미널

---

## 2. 스토리라인 구성

총 6개 씬으로 구성되며, 각 씬은 fade-out으로 자연스럽게 전환된다.

| # | 씬 | 프레임 | 시간 | 내용 |
|---|----|----|------|------|
| 1 | **Logo Reveal** | 0 – 90 | 0 – 3s | 픽셀 아트 로고 + PROFIT-LAB + AI-Powered Smart Trading |
| 2 | **Smart Trading** | 100 – 260 | 3.3 – 8.7s | 실시간 거래 시그널 4개 + 통계 배지 3개 |
| 3 | **AI Benchmark** | 270 – 430 | 9 – 14.3s | AI 주문 카드 → 리더보드 전환 |
| 4 | **Strategy Backtest** | 440 – 600 | 14.7 – 20s | 전략 카드 3종 + 승률 바 애니메이션 |
| 5 | **Proven Results** | 610 – 730 | 20.3 – 24.3s | 카운트업 통계 3종 + 에퀴티 커브 |
| 6 | **CTA** | 740 – 800 | 24.7 – 26.7s | 픽셀 로고 pulse glow + profit-lab.io |

---

## 3. 씬별 상세 내용

### Scene 1 — Logo Reveal
- favicon.svg 픽셀 패턴을 React div로 재현한 8×8 픽셀 아트 로고
- "PROFIT-LAB" 노란 glow 텍스트 (Press Start 2P)
- 사이안 divider 라인 애니메이션
- "AI-Powered Smart Trading" 서브타이틀 fade-in

### Scene 2 — Smart Trading
- "AUTO EXECUTE. MAX PROFIT." 헤드라인
- 4개 거래 시그널 카드 (BTC/ETH/SOL/BNB) — LONG/SHORT 배지 + 진입가→청산가 + P&L
- 통계 배지 3개: TOTAL TRADES 1,247 / WIN RATE 68.4% / AVG RETURN +4.5%

### Scene 3 — AI Model Benchmark
**Phase 1 (frame 0–66)**: 실시간 주문 카드
- GPT-4o / Claude 3.5 / Gemini Pro / DeepSeek R2 주문 카드
- 상태별 컬러: CLOSED=녹색, FILLED=노랑, PENDING=회색

**Phase 2 (frame 80+)**: 리더보드 fade-in 전환
- 랭킹 배지 + 모델명 + 승률 + 누적 P&L
- 1위 네온 그린 하이라이트

### Scene 4 — Strategy Backtest

| 전략 | 색상 | 승률 | 수익 | 거래수 |
|------|------|------|------|--------|
| RSI Divergence | 네온 그린 | 68% | +38.4% | 214 |
| EMA Trend | 블루 | 61% | +27.1% | 187 |
| BB Squeeze | 퍼플 | 57% | +19.8% | 156 |

### Scene 5 — Proven Results
- **68%** Win Rate (avg across strategies)
- **+557** Trades Backtested
- **+38%** Best Return (RSI Divergence)
- 에퀴티 커브 SVG 드로잉 애니메이션

### Scene 6 — CTA
- 픽셀 로고 pulse glow (Math.sin 기반 숨쉬기)
- "Start Trading Smarter Today"
- `profit-lab.io` URL 필

---

## 4. 기술 구현

### 프로젝트 구조
```
test_remotion/
├── src/
│   ├── Root.tsx                              # Composition 등록
│   └── projects/profitlab/promo-v1/
│       ├── Promo.tsx                         # 메인 — Background + 6개 Sequence
│       ├── constants.ts                      # COLORS, SCENES 타이밍
│       ├── fonts.ts                          # Press Start 2P + JetBrains Mono
│       └── scenes/
│           ├── SceneLogo.tsx                 # 픽셀 아트 로고
│           ├── SceneSmartTrade.tsx           # 거래 시그널 + 통계
│           ├── SceneBenchmark.tsx            # AI 주문 카드 + 리더보드
│           ├── SceneBacktest.tsx             # 전략 카드
│           ├── SceneResults.tsx              # 카운트업 + 에퀴티 커브
│           └── SceneCTA.tsx                  # 엔딩
```

### Remotion Composition 등록 (Root.tsx)

| Composition ID | 비율 | 해상도 | 프레임 |
|----------------|------|--------|--------|
| `ProfitLabPromoV1` | 9:16 | 1080×1920 | 800 |
| `ProfitLabPromoV1-4x5` | 4:5 | 1080×1350 | 800 |

### 씬 타이밍 수정 방법
`constants.ts`의 `SCENES` 객체에서 조정:

```ts
export const SCENES = {
  logo:       { from: 0,   duration: 90  },
  smartTrade: { from: 100, duration: 160 },
  benchmark:  { from: 270, duration: 160 },
  backtest:   { from: 440, duration: 160 },
  results:    { from: 610, duration: 120 },
  cta:        { from: 740, duration: 60  },
} as const;
```

`Root.tsx`의 `durationInFrames`도 함께 업데이트 필요 (현재 800).

### 주요 애니메이션 기법
- **spring()**: 로고/카드 등장 (damping 180–200, stiffness 80–120)
- **interpolate()**: opacity, translateX/Y, scale 전환
- **카운트업**: easing out cubic으로 숫자 증가 효과
- **SVG path 드로잉**: progress 기반 점 슬라이싱으로 에퀴티 커브 실시간 그리기
- **pulse glow**: `Math.sin(frame * 0.12)` 기반 CTA 로고 숨쉬기 효과
- **픽셀 아트 로고**: 8×8 grid를 React div 배열로 렌더링

---

## 5. 영상 데이터 출처

씬 3–5의 수치는 profit-lab 백엔드 실제 데이터 기반:

- **전략 파라미터**: `backend/tests/fixtures/v1/strategy_params.json`
  - RSI: period=14, threshold=30, SL offset=0.5%
  - EMA: ADX entry min=25, block below=20
  - BB Squeeze: period=20, min squeeze bars=15

- **벤치마크 파라미터**: `backend/tests/fixtures/v1/benchmark_params.json`
  - 상태 전이: PENDING → FILLED → CLOSED

- **전략 목록**: `backend/strategy/` (rsi_divergence.py, ema_trend.py, bb_squeeze.py)

---

## 6. 렌더링

```bash
cd /Users/myungjookim/_claude26/test_remotion

# 4:5 버전 렌더링 (권장)
npx remotion render ProfitLabPromoV1-4x5 \
  /Users/myungjookim/_claude26/profit-lab/marketingvideo/profitlab-promo-v1-4x5.mp4

# 9:16 버전 렌더링
npx remotion render ProfitLabPromoV1 \
  /Users/myungjookim/_claude26/profit-lab/marketingvideo/profitlab-promo-v1.mp4
```

| 항목 | 값 |
|------|---|
| Codec | H.264 (Remotion 기본) |
| 파일 크기 | ~3.8 MB (4:5 기준) |
| 총 프레임 | 800 (30fps) |
| 렌더링 소요 | ~60초 |

---

## 7. 동료를 위한 환경 세팅

```bash
# 1. 의존성 설치
cd test_remotion && npm install

# 2. 개발 서버 실행
npx remotion studio
# → http://localhost:3000 에서 실시간 미리보기
# → 사이드바에서 ProfitLabPromoV1 또는 ProfitLabPromoV1-4x5 선택
```

### 씬 수정 가이드

| 수정 항목 | 파일 | 변경 위치 |
|-----------|------|-----------|
| 씬 길이/순서 | `constants.ts` | `SCENES` 객체 |
| 총 영상 길이 | `Root.tsx` | `durationInFrames` |
| 배경 컬러/glow | `constants.ts` | `COLORS` 객체 |
| 거래 시그널 데이터 | `SceneSmartTrade.tsx` | `TradeSignal` props |
| AI 주문 카드 데이터 | `SceneBenchmark.tsx` | `OrderCard` props |
| 전략 카드 데이터 | `SceneBacktest.tsx` | `StrategyCard` props |
| 성과 수치 | `SceneResults.tsx` | `CountUp` target 값 |

---

## 8. 영상 수정 시 권장 워크플로우

### 핵심 원칙: Remotion Studio를 열어두고 작업

렌더링(~60초)을 거치지 않고 **파일 저장 즉시 브라우저에서 실시간 확인**할 수 있다.

```bash
cd test_remotion && npx remotion studio
# → http://localhost:3000 열어두기
```

파일을 저장하면 스튜디오에 즉시 반영된다. `padding`, `fontSize` 같은 수치 조정은 스튜디오를 보면서 직접 수정하는 것이 가장 빠르다.

---

### 작업 전 반드시: git checkpoint 저장

```bash
git add -A && git commit -m "checkpoint: before layout fix"
```

잘못 수정했을 때:
```bash
git log --oneline
git checkout <커밋해시> -- src/projects/profitlab/promo-v1/scenes/SceneBenchmark.tsx
```

---

### 역할 분담

| 작업 종류 | 방법 |
|-----------|------|
| 씬 구조 변경, 새 컴포넌트 추가, 애니메이션 로직 | Claude에게 요청 |
| `padding`, `fontSize` 등 수치 미세 조정 | Studio 열고 직접 수정 |
| 최종 렌더링 + 파일 복사 | Claude에게 요청 |

---

### 레이아웃 수치 기준 (4:5 기준 1080×1350px)

| 위치 | 방법 | 비고 |
|------|------|------|
| 화면 중앙 | `justifyContent: center` | 기본값 |
| 중앙보다 위 | `padding: '0 72px 200px'` | paddingBottom으로 위로 이동 |
| 좌우 여백 | `padding: '0 72px'` | 모든 씬 공통 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-26 | ProfitLab promo-v1 신규 제작 (픽셀 레트로 디자인, 6개 씬) |
| 2026-03-26 | 4:5 비율 추가 (ProfitLabPromoV1-4x5), 9:16 대비 Instagram 피드 최적화 |
| 2026-03-26 | 서브타이틀 및 카드 내 폰트 크기 전면 확대 (가독성 개선) |
