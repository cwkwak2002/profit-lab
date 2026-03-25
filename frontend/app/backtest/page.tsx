"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { runBacktestStream, type ProgressEvent } from "@/lib/api";
import { PxFooter } from "@/components/px-footer";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const PX = {
  black:   "var(--px-black,#0a0a1a)",
  panel:   "var(--px-panel,#12122a)",
  alt:     "var(--px-panel-alt,#1a1a4e)",
  border:  "var(--px-border,#3355ff)",
  blue:    "var(--px-blue,#3355ff)",
  cyan:    "var(--px-cyan,#00eeff)",
  pink:    "var(--px-pink,#ff2d78)",
  yellow:  "var(--px-yellow,#ffe000)",
  green:   "var(--px-green,#00ff7f)",
  red:     "var(--px-red,#ff3333)",
  white:   "var(--px-white,#f0f0ff)",
  mid:     "var(--px-grey-mid,#8888aa)",
  fp:      "var(--ff-pixel,'Press Start 2P',monospace)",
  fm:      "var(--ff-mono,'JetBrains Mono',monospace)",
  fb:      "var(--ff-body,Pretendard,sans-serif)",
} as const;

const pxLabel: React.CSSProperties = {
  fontFamily: PX.fp,
  fontSize: 8,
  color: PX.mid,
  letterSpacing: "0.06em",
  lineHeight: 2,
  textTransform: "uppercase" as const,
};

const pxInput: React.CSSProperties = {
  background: PX.alt,
  border: `2px solid ${PX.border}`,
  borderRadius: 0,
  padding: "8px 12px",
  fontFamily: PX.fm,
  fontSize: 13,
  color: PX.white,
  outline: "none",
  width: "100%",
};

/* ── Data ───────────────────────────────────────────────────────────────── */
const ALL_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE",
  "AAVE", "ADA", "APT", "ARB", "AVAX", "BCH", "BNB", "CRV", "DOT", "ENA",
  "FET", "HBAR", "HYPE", "INJ", "LINK", "LTC", "NEAR", "OP", "PEPE", "RENDER",
  "SUI", "TAO", "TRX", "UNI", "WIF",
];

const DEFAULT_COINS = ALL_COINS.slice(0, 5);

const STRATEGIES = [
  { id: "rsi_divergence", name: "RSI DIV", fullName: "RSI Divergence", desc: "RSI 상승 다이버전스 + BB 회귀 + W-Pattern 확인 후 반전 매수 (Long Only)" },
  { id: "ema_trend",      name: "EMA TREND", fullName: "EMA Trend",  desc: "1H EMA 정배열/역배열 추세 확인 후 15m 눌림목/반등 진입 (Long & Short)" },
  { id: "bb_squeeze",     name: "BB SQUEEZE", fullName: "BB Squeeze", desc: "볼린저 밴드 응축 후 거래량 동반 돌파 시 브레이크아웃 진입 (Long & Short)" },
] as const;

/* ── Inner page ─────────────────────────────────────────────────────────── */
function BacktestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStrategy = searchParams.get("strategy") || "rsi_divergence";

  const [strategy, setStrategy]           = useState(initialStrategy);
  const [startDate, setStartDate]         = useState("2026-01-01");
  const [endDate, setEndDate]             = useState("2026-03-21");
  const [selectedCoins, setSelectedCoins] = useState<string[]>(DEFAULT_COINS);
  const [status, setStatus]               = useState<string>("");
  const [progress, setProgress]           = useState<number>(0);
  const [loading, setLoading]             = useState(false);
  const [coinsExpanded, setCoinsExpanded] = useState(false);

  const COINS_VISIBLE = 20; // 2열 × 10행

  useEffect(() => {
    const s  = sessionStorage.getItem("bt_strategy");
    const sd = sessionStorage.getItem("bt_startDate");
    const ed = sessionStorage.getItem("bt_endDate");
    const c  = sessionStorage.getItem("bt_coins");
    if (s)  setStrategy(s);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
    if (c)  { try { setSelectedCoins(JSON.parse(c)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("bt_strategy",   strategy);
    sessionStorage.setItem("bt_startDate",  startDate);
    sessionStorage.setItem("bt_endDate",    endDate);
    sessionStorage.setItem("bt_coins",      JSON.stringify(selectedCoins));
  }, [strategy, startDate, endDate, selectedCoins]);

  const toggleCoin  = (coin: string) => setSelectedCoins((p) => p.includes(coin) ? p.filter((c) => c !== coin) : [...p, coin]);
  const selectAll   = () => setSelectedCoins([...ALL_COINS]);
  const deselectAll = () => setSelectedCoins([]);

  const handleRun = async () => {
    if (selectedCoins.length === 0) { setStatus("코인을 1개 이상 선택해주세요."); return; }
    setLoading(true); setProgress(0); setStatus("시작 중...");
    try {
      const runId = await runBacktestStream(
        { coins: selectedCoins, start_date: startDate, end_date: endDate, strategy },
        (event: ProgressEvent) => { setProgress(event.progress); setStatus(event.message); },
      );
      router.push(`/backtest/${runId}`);
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setLoading(false); }
  };

  const currentStrategy = STRATEGIES.find((s) => s.id === strategy)!;

  return (
    <div style={{
      background: "linear-gradient(135deg, #05051e 0%, #1a0b2e 50%, #0c0c1d 100%)",
      backgroundAttachment: "fixed",
      flex: 1,
      margin: "0 -24px -24px",
      position: "relative",
      color: PX.white,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.18) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))",
        backgroundSize: "100% 4px, 3px 100%",
        zIndex: 9998, pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 0", position: "relative", zIndex: 1 }}>

      {/* ── Page header: title only ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: PX.fp, fontSize: 13, color: PX.yellow, letterSpacing: 2, lineHeight: 1,
          textShadow: `2px 2px 0 #886600, 4px 4px 0 #443300`, marginBottom: 10 }}>
          ▶ 전략 검증
        </h1>
        <p style={{ fontFamily: PX.fb, fontSize: 14, color: PX.mid, margin: 0 }}>
          {currentStrategy.desc}
        </p>
      </div>

      {/* ── Strategy tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {STRATEGIES.map((s) => {
          const active = strategy === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              style={{
                fontFamily: PX.fp, fontSize: 8, letterSpacing: "0.05em",
                padding: "9px 16px",
                border: `2px solid ${active ? PX.cyan : PX.border}`,
                background: active ? "rgba(0,238,255,0.12)" : PX.panel,
                color: active ? PX.cyan : PX.mid,
                cursor: "pointer", borderRadius: 0,
                transition: "all 0.1s steps(1)", lineHeight: 1.6,
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = PX.white; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = PX.mid; } }}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ── 2-col grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 20 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Period */}
          <section style={{ background: PX.panel, borderLeft: `4px solid ${PX.border}`, padding: "16px 20px" }}>
            <div style={{ ...pxLabel, color: PX.cyan, marginBottom: 16 }}>■ 기간 설정</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "시작일", value: startDate, setter: setStartDate },
                { label: "종료일", value: endDate,   setter: setEndDate },
              ].map(({ label, value, setter }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={pxLabel}>{label}</label>
                  <input type="date" value={value} onChange={(e) => setter(e.target.value)} style={pxInput} />
                </div>
              ))}
            </div>
          </section>

          {/* Coin selector */}
          <section style={{ background: PX.panel, borderLeft: `4px solid ${PX.pink}`, padding: "16px 20px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ ...pxLabel, color: PX.pink, marginBottom: 0 }}>
                ■ 코인 선택 [{selectedCoins.length}/{ALL_COINS.length}]
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[
                { label: "전체 선택", action: selectAll },
                { label: "전체 해제", action: deselectAll },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{
                  fontFamily: PX.fp, fontSize: 7, padding: "5px 10px",
                  border: `2px solid ${PX.border}`, background: "transparent",
                  color: PX.mid, cursor: "pointer", borderRadius: 0,
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
              {(coinsExpanded ? ALL_COINS : ALL_COINS.slice(0, COINS_VISIBLE)).map((coin) => {
                const sel = selectedCoins.includes(coin);
                return (
                  <button key={coin} onClick={() => toggleCoin(coin)} style={{
                    fontFamily: PX.fm, fontSize: 11, fontWeight: 600,
                    padding: "5px 8px",
                    border: `2px solid ${sel ? PX.cyan : "rgba(51,85,255,0.3)"}`,
                    background: sel ? "rgba(0,238,255,0.15)" : PX.alt,
                    color: sel ? PX.cyan : PX.mid,
                    cursor: "pointer", borderRadius: 0,
                    transition: "all 0.1s steps(1)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{coin}</span>
                    {sel && <span style={{ fontSize: 8, color: PX.cyan }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {/* 펼치기/접기 버튼 */}
            <button
              onClick={() => setCoinsExpanded((v) => !v)}
              style={{
                width: "100%", marginTop: 6,
                padding: "6px 0",
                background: "rgba(51,85,255,0.08)",
                border: `1px solid rgba(51,85,255,0.3)`,
                color: PX.mid,
                cursor: "pointer", borderRadius: 0,
                fontFamily: PX.fm, fontSize: 11,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.1s steps(1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = PX.white; e.currentTarget.style.background = "rgba(51,85,255,0.16)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = PX.mid; e.currentTarget.style.background = "rgba(51,85,255,0.08)"; }}
            >
              {coinsExpanded
                ? <>▲ 접기 <span style={{ color: PX.mid, fontSize: 9 }}>({ALL_COINS.length - COINS_VISIBLE}개 숨기기)</span></>
                : <>▼ 더 보기 <span style={{ color: PX.mid, fontSize: 9 }}>({ALL_COINS.length - COINS_VISIBLE}개 더)</span></>
              }
            </button>
          </section>

        </div>

        {/* ── RIGHT COLUMN: execution + strategy rules ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── Execution Section: run button + progress + 4 metric tiles ── */}
        <section style={{ background: "#0c0c1d", border: `2px solid rgba(51,85,255,0.3)`, padding: "24px" }}>
          {/* Run button + progress bar */}
          <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "center", marginBottom: 20 }}>
            <button
              onClick={handleRun}
              disabled={loading}
              style={{
                fontFamily: PX.fp, fontSize: 9, letterSpacing: "0.1em",
                padding: "16px 32px",
                border: `3px solid ${loading ? PX.mid : PX.cyan}`,
                background: loading ? PX.alt : "transparent",
                color: loading ? PX.mid : PX.cyan,
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: 0,
                flexShrink: 0,
                transition: "all 0.1s steps(1)",
                textShadow: loading ? "none" : `0 0 10px ${PX.cyan}`,
                boxShadow: loading ? "none" : `0 0 20px rgba(0,238,255,0.4)`,
                whiteSpace: "nowrap" as const,
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = PX.cyan; e.currentTarget.style.color = "#000"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = PX.cyan; } }}
            >
              {loading ? "▶▶ 실행 중..." : "▶ 백테스트 실행"}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.mid }}>
                  {status || "INITIALIZING BACKTEST ENGINE..."}
                </span>
                <span style={{ fontFamily: PX.fm, fontSize: 13, color: PX.cyan, fontWeight: 700 }}>
                  {loading ? `${progress}%` : "--"}
                </span>
              </div>
              <div style={{ height: 16, background: "rgba(41,40,58,0.6)", border: `1px solid rgba(51,85,255,0.4)`, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: loading ? `${progress}%` : "0%",
                  background: `linear-gradient(90deg, #0a0a2e 0%, #4b0082 50%, ${PX.cyan} 100%)`,
                  boxShadow: `inset 0 0 10px rgba(0,238,255,0.5)`,
                  transition: "width 0.3s ease-out",
                }} />
              </div>
            </div>
          </div>
          {/* 4 metric tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "TOTAL_TRADES", value: "--" },
              { label: "WIN_RATE",     value: "--%", color: PX.mid },
              { label: "PROFIT_FACTOR",value: "0.00" },
              { label: "NET_PROFIT",   value: "$0.00" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "12px 14px", background: "#1e1e2f" }}>
                <div style={{ fontFamily: PX.fm, fontSize: 9, color: PX.mid, marginBottom: 6, letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontFamily: PX.fm, fontSize: 20, fontWeight: 700, color: color ?? PX.white }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: `2px solid ${PX.border}`, background: PX.panel, flex: 1 }}>
          {/* Section header */}
          <div style={{
            padding: "14px 24px",
            borderBottom: `2px solid ${PX.border}`,
            background: PX.alt,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.cyan, letterSpacing: "0.06em" }}>
              ■ 전략 상세 규칙
            </span>
            <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.mid, background: "#0d0d22", padding: "2px 8px", border: `1px solid ${PX.border}` }}>
              v2.4.0_STABLE
            </span>
          </div>

            {/* Rules content — always visible */}
          <div style={{ padding: "20px 24px", fontFamily: PX.fm, fontSize: 12, color: PX.white, lineHeight: 1.9 }}>
            {strategy === "rsi_divergence" ? (
              <>
                <RuleBlock title="진입 조건 — 4중 필터 (1H 봉)" visual={<VizDivergence />}>
                  <li><b>RSI 상승 다이버전스</b> — 가격 Lower Low + RSI Higher Low (최소 하나 RSI &lt; 30)</li>
                  <li><b>BB 회귀</b> — BB(20, 2σ) 하단 터치/이탈 후 밴드 내부 복귀 종가</li>
                  <li><b>RSI W-Pattern</b> — RSI 30 미만 → 30선 상향 재돌파 (과매도 탈출 확정)</li>
                  <li><b>캔들 반전</b> — 망치형(Hammer) 또는 상승 장악형 양봉 (직전 음봉 50%+ 커버)</li>
                  <li>조건 확정된 봉 마감 직후, 다음 봉 시가에 진입</li>
                </RuleBlock>
                <RuleBlock title="위험 회피 필터" visual={<VizRiskFilter items={["VOLATILITY  3%+ in 5min → 60min cooldown","RSI FLOOD   RSI<30 10봉+ 연속 진입금지","BTC GUARD   BTC 1H -5%+ → Long 금지","DEAD ZONE   EMA 대비 -10% 이격 금지"]}/>}>
                  <li>5분 내 3%+ 급변 → 60분 쿨다운 (변동성 폭발)</li>
                  <li>RSI 30 이하 10봉+ 연속 → 진입 금지 (RSI 침수)</li>
                  <li>BTC 1H -5%+ 급락 시 → 알트코인 Long 금지 (BTC 가드)</li>
                  <li>가격이 1H 200 EMA 대비 -10% 이상 이격 → 진입 금지 (데드 존)</li>
                </RuleBlock>
                <RuleBlock title="청산 규칙 (1m 봉)" visual={<VizExitRSI />}>
                  <li><span style={{ color: PX.red }}>SL</span> — 다이버전스 최근 저가 - 0.5%</li>
                  <li><span style={{ color: PX.cyan }}>TP1 (50%)</span> — RSI ≥ 70 또는 손익비 1.5배 도달 → 본절로스 이동</li>
                  <li><span style={{ color: PX.green }}>TP2 (50%)</span> — 15m 200 EMA 터치 시 전량 청산</li>
                </RuleBlock>
              </>
            ) : strategy === "ema_trend" ? (
              <>
                <RuleBlock title="추세 확인 (1H 봉)" visual={<VizEMACross />}>
                  <li><span style={{ color: PX.green }}>Long</span> — 50 EMA &gt; 200 EMA 정배열 (골든크로스)</li>
                  <li><span style={{ color: PX.red }}>Short</span> — 50 EMA &lt; 200 EMA 역배열 (데드크로스)</li>
                  <li>ADX(14) ≥ 25 — 추세 강도 확인</li>
                  <li>No-Trade Zone: ADX &lt; 20 또는 50/200 EMA 간격 &lt; 0.5%</li>
                </RuleBlock>
                <RuleBlock title="진입 조건 (15m 봉)" visual={<VizPullback />}>
                  <li><span style={{ color: PX.green }}>Long</span> — 15m 가격이 50 EMA로 눌림목 형성 후 재돌파</li>
                  <li><span style={{ color: PX.red }}>Short</span> — 15m 가격이 50 EMA 위로 반등 후 재이탈</li>
                  <li>현재 거래량 &gt; 최근 20봉 평균 거래량</li>
                  <li>다음 봉 시가에 진입</li>
                </RuleBlock>
                <RuleBlock title="청산 규칙" visual={<VizEMAExits />}>
                  <li><span style={{ color: PX.red }}>SL</span> — 15m 200 EMA 이탈 (동적 추적)</li>
                  <li><span style={{ color: PX.cyan }}>TP1 (Long)</span> — 손익비 1:2 지점 → 50% 청산</li>
                  <li><span style={{ color: PX.cyan }}>TP1 (Short)</span> — 손익비 1:1.5 지점 → 50% 청산</li>
                  <li><b>BE</b> — TP1 체결 즉시, 잔여 50% 손절가를 진입가로 이동</li>
                  <li><span style={{ color: PX.green }}>EMA Cross</span> — 15m EMA 역크로스 시 전량 청산</li>
                </RuleBlock>
                <RuleBlock title="위험 회피 필터" visual={<VizRiskFilter items={["EMA GAP    50/200 간격 <0.5% → 금지","EMA TRAP   가격이 EMA 사이에 갇힘 → 금지","ADX WEAK   ADX(14) <20 → 금지","VOLATILITY 3%+ in 5min → 60min cooldown","BTC GUARD  BTC 1H -5% → Long 금지"]}/>}>
                  <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                  <li>15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힌 경우 → 진입 금지</li>
                  <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                  <li>5분 내 3%+ 급등/급락 발생 → 해당 심볼 60분 쿨다운</li>
                  <li>BTC 1H 수익률 -5% 이하 → 알트코인 Long 진입 금지</li>
                </RuleBlock>
              </>
            ) : (
              <>
                <RuleBlock title="스퀘즈 확인 (15m 봉)" visual={<VizBBSqueeze />}>
                  <li>BB Width(20, 2σ)가 최근 100봉 중 하위 20% = 응축 구간</li>
                  <li>스퀘즈 상태가 최소 15봉 이상 지속된 후의 돌파만 유효</li>
                </RuleBlock>
                <RuleBlock title="진입 조건 (15m 봉)" visual={<VizBBBreakout />}>
                  <li><span style={{ color: PX.green }}>Long</span> — 종가 &gt; BB 상단 + 거래량 ≥ 평균의 200%</li>
                  <li><span style={{ color: PX.red }}>Short</span> — 종가 &lt; BB 하단 + 거래량 ≥ 평균의 250%</li>
                  <li>다음 봉 시가에 진입</li>
                </RuleBlock>
                <RuleBlock title="청산 규칙 (1m 봉)" visual={<VizBBDynamicStop />}>
                  <li><span style={{ color: PX.red }}>SL</span> — BB 중심선 (20 SMA) 터치 시 전량 청산</li>
                  <li><span style={{ color: "#c084fc" }}>Long TRAIL</span> — 수익 발생 후 밴드 안쪽 복귀 시 트레일링 스탑</li>
                  <li><span style={{ color: PX.green }}>Short TP</span> — 고정 수익률 +3.5% 도달 시 즉시 청산</li>
                </RuleBlock>
                <RuleBlock title="위험 회피 필터" visual={<VizRiskFilter items={["EMA GAP    50/200 간격 <0.5% → 금지","ADX WEAK   ADX(14) <20 → 금지","VOLATILITY 3%+ in 5min → 60min cooldown","BTC GUARD  BTC 1H -5% → Long 금지"]}/>}>
                  <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                  <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                  <li>5분 내 3%+ 급등/급락 발생 → 해당 심볼 60분 쿨다운</li>
                  <li>BTC 1H 수익률 -5% 이하 → 알트코인 Long 진입 금지</li>
                </RuleBlock>
              </>
            )}
            <RuleBlock title="실행 조건">
              <li>코인별 초기 시드 $100 · 레버리지 10x · 전액 투입 · 복리</li>
              <li>수수료 Taker 0.04% (진입/청산 각각) · 슬리피지 0.05%</li>
            </RuleBlock>
          </div>
        </section>

        </div>{/* end right column flex */}

      </div>{/* end 2-col grid */}

      </div>{/* end inner padding wrapper */}

      <PxFooter />

    </div>
  );
}

/* ── Rule block helper ───────────────────────────────────────────────────── */
function RuleBlock({ title, children, visual }: { title: string; children: React.ReactNode; visual?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)",
        fontSize: 8, color: "var(--px-cyan,#00eeff)",
        marginBottom: 10, letterSpacing: "0.06em",
      }}>
        › {title}
      </div>
      <ul style={{ paddingLeft: 20, margin: 0, listStyle: "disc", color: "var(--px-white,#f0f0ff)", fontFamily: "var(--ff-mono,'JetBrains Mono',monospace)", fontSize: 12 }}>
        {children}
      </ul>
      {visual && <div style={{ marginTop: 10, maxWidth: 280 }}>{visual}</div>}
    </div>
  );
}

/* ── Mini visualizations ────────────────────────────────────────────────── */
const VIZ = {
  bg: "#0a0a1a",
  border: "1px solid rgba(51,85,255,0.3)",
  ff: "'JetBrains Mono',monospace",
};

function VizDivergence() {
  return (
    <svg width="100%" viewBox="0 0 220 88" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">PRICE</text>
      <text x="6" y="52" fontSize="7" fontFamily={VIZ.ff} fill="#555577">RSI</text>
      <line x1="0" y1="44" x2="220" y2="44" stroke="rgba(51,85,255,0.25)" strokeWidth="1" strokeDasharray="3,3"/>
      {/* Price — lower low */}
      <polyline points="18,18 45,30 72,14 100,34 128,10 158,22 190,9" fill="none" stroke="#f0f0ff" strokeWidth="1.5"/>
      <circle cx="45" cy="30" r="3" fill="none" stroke="#ffe000" strokeWidth="1.5"/>
      <circle cx="100" cy="34" r="3" fill="none" stroke="#ffe000" strokeWidth="1.5"/>
      <line x1="45" y1="30" x2="100" y2="34" stroke="#ffe000" strokeWidth="1" strokeDasharray="4,2"/>
      <text x="34" y="28" fontSize="6" fontFamily={VIZ.ff} fill="#ffe000">L1</text>
      <text x="103" y="32" fontSize="6" fontFamily={VIZ.ff} fill="#ffe000">L2↓</text>
      {/* RSI — higher low */}
      <polyline points="18,60 45,74 72,58 100,70 128,54 158,64 190,52" fill="none" stroke="#00eeff" strokeWidth="1.5"/>
      <circle cx="45" cy="74" r="3" fill="none" stroke="#00ff7f" strokeWidth="1.5"/>
      <circle cx="100" cy="70" r="3" fill="none" stroke="#00ff7f" strokeWidth="1.5"/>
      <line x1="45" y1="74" x2="100" y2="70" stroke="#00ff7f" strokeWidth="1" strokeDasharray="4,2"/>
      <text x="34" y="72" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">L1</text>
      <text x="103" y="68" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">L2↑</text>
      <text x="138" y="44" fontSize="7" fontFamily={VIZ.ff} fill="#ffe000">◀ DIVERGENCE</text>
    </svg>
  );
}

function VizRiskFilter({ items }: { items: string[] }) {
  return (
    <div style={{ background: VIZ.bg, border: VIZ.border, padding: "8px 12px" }}>
      <div style={{ fontFamily: VIZ.ff, fontSize: 7, color: "#555577", marginBottom: 6, letterSpacing: "0.06em" }}>RISK FILTER STATUS</div>
      {items.map((label) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#ff3333", fontSize: 8, lineHeight: 1 }}>⊗</span>
          <span style={{ fontFamily: VIZ.ff, fontSize: 9, color: "#8888aa" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function VizExitRSI() {
  const cy = { entry: 46, tp2: 14, tp1: 30, sl: 62 };
  return (
    <svg width="100%" viewBox="0 0 220 78" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <rect x="28" y={cy.tp2} width="8" height={cy.entry - cy.tp2} fill="rgba(0,255,127,0.08)"/>
      <rect x="28" y={cy.entry} width="8" height={cy.sl - cy.entry} fill="rgba(255,51,51,0.08)"/>
      <line x1="28" y1={cy.tp2}   x2="215" y2={cy.tp2}   stroke="#00ff7f"  strokeWidth="1"/>
      <line x1="28" y1={cy.tp1}   x2="215" y2={cy.tp1}   stroke="#00eeff"  strokeWidth="1"/>
      <line x1="28" y1={cy.entry} x2="215" y2={cy.entry} stroke="#f0f0ff"  strokeWidth="1.5" strokeDasharray="4,2"/>
      <line x1="28" y1={cy.sl}    x2="215" y2={cy.sl}    stroke="#ff3333"  strokeWidth="1"/>
      <text x="0"  y={cy.tp2+4}   fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">TP2</text>
      <text x="0"  y={cy.tp1+4}   fontSize="6" fontFamily={VIZ.ff} fill="#00eeff">TP1</text>
      <text x="0"  y={cy.entry+4} fontSize="6" fontFamily={VIZ.ff} fill="#f0f0ff">IN</text>
      <text x="0"  y={cy.sl+4}    fontSize="6" fontFamily={VIZ.ff} fill="#ff3333">SL</text>
      <text x="40" y={cy.tp2+4}   fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">15m 200 EMA 터치 → 전량</text>
      <text x="40" y={cy.tp1+4}   fontSize="6" fontFamily={VIZ.ff} fill="#00eeff">RSI≥70 또는 R×1.5 → 50% + BE</text>
      <text x="40" y={cy.sl+4}    fontSize="6" fontFamily={VIZ.ff} fill="#ff3333">다이버전스 저가 -0.5%</text>
    </svg>
  );
}

function VizEMACross() {
  return (
    <svg width="100%" viewBox="0 0 220 80" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">1H EMA CROSSOVER</text>
      {/* EMA 200 — slow */}
      <polyline points="18,58 55,55 88,50 118,46 148,42 180,38 210,35" fill="none" stroke="#555577" strokeWidth="1.5" strokeDasharray="5,3"/>
      <text x="194" y="34" fontSize="6" fontFamily={VIZ.ff} fill="#555577">200</text>
      {/* EMA 50 — faster, crosses above */}
      <polyline points="18,68 55,62 88,50 118,36 148,26 180,20 210,15" fill="none" stroke="#00eeff" strokeWidth="2"/>
      <text x="194" y="14" fontSize="6" fontFamily={VIZ.ff} fill="#00eeff">50</text>
      {/* Cross marker */}
      <circle cx="88" cy="50" r="5" fill="none" stroke="#00ff7f" strokeWidth="1.5"/>
      <text x="52" y="72" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">★ GOLDEN X</text>
      <text x="140" y="20" fontSize="8" fontFamily={VIZ.ff} fill="#00ff7f">▲ LONG</text>
      {/* Death cross hint */}
      <polyline points="148,26 180,34 210,44" fill="none" stroke="#ff3333" strokeWidth="1.5" strokeDasharray="3,2"/>
      <text x="178" y="56" fontSize="6" fontFamily={VIZ.ff} fill="#ff3333">▼ SHORT</text>
    </svg>
  );
}

function VizPullback() {
  return (
    <svg width="100%" viewBox="0 0 220 80" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">15m PULLBACK ENTRY</text>
      {/* EMA 50 trend line */}
      <polyline points="18,64 60,57 100,50 140,43 185,36" fill="none" stroke="#00eeff" strokeWidth="1.5" strokeDasharray="4,2"/>
      <text x="188" y="40" fontSize="6" fontFamily={VIZ.ff} fill="#00eeff">EMA50</text>
      {/* Price: up trend → pullback to EMA → re-entry */}
      <polyline points="18,58 42,44 66,32 82,46 96,52 110,49 126,37 152,24 182,15" fill="none" stroke="#f0f0ff" strokeWidth="2"/>
      {/* Pullback zone */}
      <rect x="78" y="44" width="34" height="12" fill="rgba(255,224,0,0.07)" stroke="rgba(255,224,0,0.4)" strokeWidth="1"/>
      <text x="80" y="70" fontSize="6" fontFamily={VIZ.ff} fill="#ffe000">눌림목 구간</text>
      {/* Entry arrow */}
      <polygon points="118,47 112,54 124,54" fill="#00ff7f"/>
      <text x="126" y="52" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">ENTRY</text>
    </svg>
  );
}

function VizEMAExits() {
  return (
    <div style={{ background: VIZ.bg, border: VIZ.border, padding: "10px 12px" }}>
      <div style={{ fontFamily: VIZ.ff, fontSize: 7, color: "#555577", marginBottom: 8, letterSpacing: "0.06em" }}>MULTI-STAGE EXIT FLOW</div>
      {[
        { icon: "◆", label: "TP1 (50%)", desc: "R×2 도달 → 절반 청산", color: "#00eeff" },
        { icon: "▬", label: "BE SL",    desc: "TP1 후 SL → 진입가 이동",  color: "#ffe000" },
        { icon: "✕", label: "EMA CROSS",desc: "15m 역크로스 → 전량 청산",color: "#ff2d78" },
      ].map(({ icon, label, desc, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ color, fontSize: 9, width: 14, textAlign: "center" as const }}>{icon}</span>
          <span style={{ fontFamily: VIZ.ff, fontSize: 9, color: "#8888aa", width: 72 }}>{label}</span>
          <span style={{ fontFamily: VIZ.ff, fontSize: 9, color }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}

function VizBBSqueeze() {
  return (
    <svg width="100%" viewBox="0 0 220 80" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">BB WIDTH COMPRESSION → EXPANSION</text>
      {/* SMA center */}
      <line x1="18" y1="40" x2="202" y2="40" stroke="#555577" strokeWidth="1" strokeDasharray="3,3"/>
      {/* Upper band: narrows then expands */}
      <polyline points="18,18 42,22 66,28 86,33 104,35 118,34 132,28 155,18 185,8 202,4" fill="none" stroke="#3355ff" strokeWidth="1.5"/>
      {/* Lower band: mirror */}
      <polyline points="18,62 42,58 66,52 86,47 104,45 118,46 132,52 155,62 185,72 202,76" fill="none" stroke="#3355ff" strokeWidth="1.5"/>
      {/* Band fill */}
      <polygon points="18,18 42,22 66,28 86,33 104,35 118,34 132,28 155,18 185,8 202,4 202,76 185,72 155,62 132,52 118,46 104,45 86,47 66,52 42,58 18,62" fill="rgba(51,85,255,0.06)"/>
      {/* Squeeze zone */}
      <rect x="82" y="32" width="38" height="16" fill="none" stroke="rgba(255,224,0,0.6)" strokeWidth="1" strokeDasharray="2,2"/>
      <text x="84" y="29" fontSize="6" fontFamily={VIZ.ff} fill="#ffe000">SQUEEZE</text>
      {/* Breakout arrow */}
      <polygon points="190,12 184,20 196,20" fill="#00ff7f"/>
      <text x="168" y="32" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">BREAK!</text>
    </svg>
  );
}

function VizBBBreakout() {
  return (
    <svg width="100%" viewBox="0 0 220 80" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">VOLUME SURGE + BREAKOUT</text>
      {/* BB upper band */}
      <polyline points="18,38 65,36 100,34 130,28 160,20 195,12" fill="none" stroke="#3355ff" strokeWidth="1.5"/>
      {/* Price breaking above */}
      <polyline points="18,44 50,42 82,38 100,32 116,22 136,14 158,8" fill="none" stroke="#00ff7f" strokeWidth="2"/>
      {/* Volume bars */}
      {[22, 36, 50, 64, 78, 92, 106, 120].map((x, i) => {
        const h = i < 5 ? 8 : i < 6 ? 14 : 24;
        return <rect key={x} x={x} y={76 - h} width="9" height={h} fill={i >= 6 ? "#00ff7f" : "#444466"} opacity={0.85}/>;
      })}
      <text x="92" y="76" fontSize="6" fontFamily={VIZ.ff} fill="#00ff7f">VOL ≥ 200%</text>
      <text x="140" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#00ff7f">BREAK!</text>
    </svg>
  );
}

function VizBBDynamicStop() {
  return (
    <svg width="100%" viewBox="0 0 220 78" style={{ display: "block", background: VIZ.bg, border: VIZ.border }}>
      <text x="6" y="10" fontSize="7" fontFamily={VIZ.ff} fill="#555577">DYNAMIC STOP — SMA(20) TOUCH</text>
      {/* SMA center line (dynamic stop) */}
      <polyline points="18,52 55,50 90,47 125,44 160,42 195,40" fill="none" stroke="#ffe000" strokeWidth="1.5" strokeDasharray="5,2"/>
      <text x="196" y="44" fontSize="6" fontFamily={VIZ.ff} fill="#ffe000">SMA</text>
      {/* Price: rises, then comes back down to SMA */}
      <polyline points="18,56 42,46 66,34 90,22 110,28 128,38 148,42 160,43" fill="none" stroke="#f0f0ff" strokeWidth="2"/>
      {/* Touch point */}
      <circle cx="160" cy="42" r="5" fill="none" stroke="#ff3333" strokeWidth="1.5"/>
      <line x1="160" y1="42" x2="195" y2="42" stroke="#ff3333" strokeWidth="1" strokeDasharray="3,2"/>
      <text x="166" y="38" fontSize="6" fontFamily={VIZ.ff} fill="#ff3333">SL HIT</text>
      {/* Long trail arrow */}
      <text x="65" y="20" fontSize="6" fontFamily={VIZ.ff} fill="#c084fc">TRAIL ▲</text>
    </svg>
  );
}

function VizSeedCompound() {
  return (
    <div style={{ background: VIZ.bg, border: VIZ.border, padding: "10px 12px" }}>
      <div style={{ fontFamily: VIZ.ff, fontSize: 7, color: "#555577", marginBottom: 8, letterSpacing: "0.06em" }}>EXECUTION SETUP</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        {[
          { label: "SEED",  value: "$100", color: "#f0f0ff" },
          { label: "LEV",   value: "×10",  color: "#00eeff" },
          { label: "FEE",   value: "0.04%",color: "#ff3333" },
          { label: "SLIP",  value: "0.05%",color: "#ffe000" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" as const }}>
            <div style={{ fontFamily: VIZ.ff, fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: VIZ.ff, fontSize: 6, color: "#555577", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: VIZ.ff, fontSize: 6, color: "#555577", marginBottom: 4 }}>REINVEST 복리 누적</div>
      <div style={{ height: 8, background: "#1a1a4e", border: "1px solid rgba(51,85,255,0.3)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #3355ff 0%, #8a2be2 60%, #00eeff 100%)" }}/>
      </div>
    </div>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────── */
export default function BacktestPage() {
  return (
    <Suspense>
      <BacktestPageInner />
    </Suspense>
  );
}
