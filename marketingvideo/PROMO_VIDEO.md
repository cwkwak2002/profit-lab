# Supercycl 홍보 영상 제작 기록

| 항목 | 내용 |
|------|------|
| **영상 파일** | `supercycl-promo-27s.mp4` |
| **총 길이** | ~27초 (800프레임 @ 30fps) |
| **해상도** | 1080 × 1920 (세로형 — 쇼츠/릴스 최적화) |
| **제작 도구** | Remotion 4.0 (React 기반 영상 렌더링) |
| **최종 수정일** | 2026-03-26 |

---

## 1. 영상 컨셉

### 브랜드 방향
Supercycl은 AI 모델들이 실전 거래를 경쟁하고, 검증된 전략으로 수익을 내는 **차세대 트레이딩 플랫폼**이다.
홍보 영상은 이 두 가지 핵심 가치를 직관적으로 전달하는 것을 목표로 설계했다.

- **AI 벤치마크**: 여러 AI 모델이 실제 주문을 내고 성과로 순위를 겨룬다
- **전략 백테스트**: 수백 번의 과거 거래 데이터로 승률을 검증한 전략을 제공한다

### 비주얼 컨셉
- **컬러**: `#060610` 딥 다크 배경 + `#37FF00` 네온 그린 포인트
- **타이포**: Exo 2 ExtraBold Italic (브랜드명) + IBM Plex Sans (본문)
- **분위기**: 미래적, 기술적, 신뢰감 — 블룸버그 터미널 + 사이버펑크 미감

---

## 2. 스토리라인 구성

총 7개 씬으로 구성되며, 각 씬은 fade-out으로 자연스럽게 전환된다.

| # | 씬 | 프레임 | 시간 | 내용 |
|---|----|----|------|------|
| 1 | **Logo Reveal** | 0 – 80 | 0 – 2.7s | 브랜드 심볼 + SUPERCYCL 텍스트 + 태그라인 등장 |
| 2 | **Connected Exchanges** | 90 – 210 | 3 – 7s | 5개 거래소 로고 배지 순차 등장 |
| 3 | **AI Model Benchmark** | 220 – 380 | 7.3 – 12.7s | AI 주문 카드(PENDING→FILLED→CLOSED) → 리더보드 전환 |
| 4 | **Strategy Backtest** | 390 – 550 | 13 – 18.3s | RSI DIV / EMA TREND / BB SQUEEZE 전략 카드 + 승률 바 |
| 5 | **Proven Results** | 560 – 680 | 18.7 – 22.7s | 카운트업 숫자(승률 68% / 557 trades / +38%) + 에퀴티 커브 |
| 6 | **Why Supercycl?** | 690 – 760 | 23 – 25.3s | 5 거래소 / 1 지갑 / ∞ 수익 StatCard |
| 7 | **CTA** | 770 – 800 | 25.7 – 26.7s | 로고 + SUPERCYCL + Start Trading Today + app.supercycl.io |

---

## 3. 씬별 상세 내용

### Scene 1 — Logo Reveal
- 브랜드 심볼 이미지 (배경 제거된 투명 PNG) spring 애니메이션으로 등장
- "SUPERCYCL" 텍스트 네온 그린 glow 효과
- 하단 "Trade Everywhere. Win Together." 태그라인 fade-in

### Scene 2 — Connected Exchanges
- "One Platform. **5 Exchanges.**" 헤드라인
- OKX / Gate / Bybit / Bitget / Hyperliquid 로고 배지 stagger 등장 (2×2 그리드 + 중앙 1개)
- "+ More partnerships coming" 힌트 텍스트

### Scene 3 — AI Model Benchmark
**Phase 1 (frame 0–66)**: 실시간 주문 카드
- GPT-4o / Claude 3.5 / Gemini Pro / DeepSeek R2 주문 카드
- 각 카드: 모델명 + 코인페어 + LONG/SHORT 배지 + P&L + 상태(PENDING/FILLED/CLOSED)
- 상태별 컬러: CLOSED=녹색, FILLED=노랑, PENDING=회색

**Phase 2 (frame 80+)**: 리더보드 — fade-in 전환 (슬라이드 없음)
- 랭킹 배지 + 모델명 + 승률 + 누적 P&L
- 1위 강조 (네온 그린 하이라이트)

### Scene 4 — Strategy Backtest
profit-lab 실제 전략 3종을 카드로 시각화:

| 전략 | 색상 | 승률 | 누적수익 | 거래수 |
|------|------|------|---------|--------|
| RSI Divergence | 네온 그린 | 68% | +38.4% | 214 |
| EMA Trend | 블루 | 61% | +27.1% | 187 |
| BB Squeeze | 퍼플 | 57% | +19.8% | 156 |

- 각 카드: 전략 태그 + 설명 + 승률 바 애니메이션

### Scene 5 — Proven Results
- 3개 BigStat 카드 (scale spring 애니메이션):
  - **68%** Win Rate (avg across strategies)
  - **+557** Trades Backtested
  - **+38%** Best Return (RSI Divergence)
- 에퀴티 커브 SVG 드로잉 애니메이션 (우상향 곡선 + 면적 그라디언트)

### Scene 6 — Why Supercycl?
- **5** Exchanges Connected — Best prices across all markets
- **1** Wallet Required — Start trading in seconds
- **∞** Your Rewards — Keep everything you earn

### Scene 7 — CTA (엔딩)
- 브랜드 심볼 + SUPERCYCL pulse glow 애니메이션
- "Start Trading Today"
- `app.supercycl.io` URL 필

---

## 4. 기술 구현

### 프로젝트 구조
```
test_remotion/
├── src/
│   ├── Root.tsx                          # Composition 등록 (800프레임)
│   └── projects/supercycl/promo-10s/
│       ├── Promo.tsx                     # 메인 — 7개 Sequence 조합
│       ├── constants.ts                  # 컬러, 거래소, 씬 타이밍
│       ├── fonts.ts                      # Exo2 + IBM Plex Sans
│       └── scenes/
│           ├── SceneLogo.tsx
│           ├── SceneExchanges.tsx
│           ├── SceneBenchmark.tsx
│           ├── SceneBacktest.tsx
│           ├── SceneWinRate.tsx
│           ├── SceneValueProps.tsx
│           └── SceneCTA.tsx
└── public/logos/
    ├── supercycl_nobg.png                # 배경 제거 로고 (Python PIL)
    ├── okx.png / gate.png / bybit.png
    ├── bitget.png / hyper.png
```

### 씬 타이밍 수정 방법
`constants.ts`의 `SCENES` 객체에서 각 씬의 `from`(시작 프레임)과 `duration`(길이)을 조정:

```ts
export const SCENES = {
  logo:       { from: 0,   duration: 80  },
  exchanges:  { from: 90,  duration: 120 },
  benchmark:  { from: 220, duration: 160 },
  backtest:   { from: 390, duration: 160 },
  winRate:    { from: 560, duration: 120 },  // 4초
  valueProps: { from: 690, duration: 70  },
  cta:        { from: 770, duration: 30  },
} as const;
```

`Root.tsx`의 `durationInFrames`도 함께 업데이트 필요 (현재 800).

### 주요 애니메이션 기법
- **spring()**: 로고/카드 등장 (damping 180–200, stiffness 80–120)
- **interpolate()**: opacity, translateX/Y, scale 전환
- **카운트업**: easing out cubic으로 숫자 증가 효과
- **SVG path 드로잉**: progress 기반 점 슬라이싱으로 에퀴티 커브 실시간 그리기
- **pulse glow**: `Math.sin(frame * 0.15)` 기반 CTA 로고 숨쉬기 효과

### 로고 배경 제거
```python
# Python PIL + NumPy로 검은 배경 투명 처리
darkness = R + G + B
alpha = where(darkness < 80, 0,
        where(darkness > 180, 255,
        (darkness - 80) / 100 * 255))
```

---

## 5. 영상 데이터 출처

씬 3–5의 수치는 profit-lab 백엔드 실제 데이터 기반:

- **전략 파라미터**: `backend/tests/fixtures/v1/strategy_params.json`
  - RSI: period=14, threshold=30, SL offset=0.5%
  - EMA: ADX entry min=25, block below=20
  - BB Squeeze: period=20, min squeeze bars=15

- **벤치마크 파라미터**: `backend/tests/fixtures/v1/benchmark_params.json`
  - 주문 타임아웃: 30분
  - 포지션 타임아웃: 360분
  - 상태 전이: PENDING → FILLED → CLOSED

- **전략 목록**: `backend/strategy/` (rsi_divergence.py, ema_trend.py, bb_squeeze.py)

---

## 6. 렌더링 및 배포

```bash
# 렌더링
cd /Users/myungjookim/_claude26/test_remotion
npx remotion render SupercyclPromo10s out/supercycl-promo-27s.mp4

# 로컬 재생 호환 변환 (yuv420p + faststart)
ffmpeg -i out/supercycl-promo-27s.mp4 \
  -c:v libx264 -profile:v baseline -pix_fmt yuv420p \
  -movflags +faststart -c:a aac \
  /path/to/marketingvideo/supercycl-promo-27s.mp4
```

| 항목 | 값 |
|------|---|
| Codec | H.264 baseline, yuv420p |
| 파일 크기 | ~2.2 MB |
| 총 프레임 | 800 (30fps) |
| 렌더링 소요 | ~60초 |

---

## 7. 동료를 위한 환경 세팅

### 사전 준비
```bash
# 1. Remotion 스캐폴드 생성
npm create video@latest
# → TypeScript 선택, 프로젝트명 test_remotion

# 2. remotion-best-practices skill 설치 (Claude Code)
# Claude Code에서: /install-skill remotion-best-practices

# 3. 의존성 설치
cd test_remotion && npm install

# 4. 소스 복사
# 이 저장소의 test_remotion/src/ 및 test_remotion/public/ 폴더를 덮어쓰기

# 5. 개발 서버 실행
npx remotion studio
# → http://localhost:3000 에서 실시간 미리보기
```

### 씬 수정 가이드

| 수정 항목 | 파일 | 변경 위치 |
|-----------|------|-----------|
| 씬 길이/순서 | `constants.ts` | `SCENES` 객체 |
| 총 영상 길이 | `Root.tsx` | `durationInFrames` |
| 주문 카드 데이터 | `SceneBenchmark.tsx` | `OrderCard` props |
| 전략 카드 데이터 | `SceneBacktest.tsx` | `StrategyCard` props |
| 승률/수익 숫자 | `SceneWinRate.tsx` | `CountUp` target 값 |
| 브랜드 컬러 | `constants.ts` | `COLORS` 객체 |

### 알려진 이슈

| 이슈 | 원인 | 해결 |
|------|------|------|
| 로컬에서 영상 재생 안 됨 | yuvj420p pixel format | FFmpeg으로 yuv420p + faststart 재인코딩 |
| 거래소 로고 안 보임 | `public/logos/` 에 파일 없음 | `cp src/logos/*.png public/logos/` |
| React 타입 오류 | `React` import 누락 | `import React from 'react'` 추가 |
