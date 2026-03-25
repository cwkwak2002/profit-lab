"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { runBacktestStream, type ProgressEvent } from "@/lib/api";

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

const pxPanel: React.CSSProperties = {
  background: PX.panel,
  border: `2px solid ${PX.border}`,
  borderRadius: 0,
  padding: "20px 24px",
};

const pxLabel: React.CSSProperties = {
  fontFamily: PX.fp,
  fontSize: 7,
  color: PX.mid,
  letterSpacing: "0.08em",
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

/* ── Sub-components ─────────────────────────────────────────────────────── */
function PxSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div style={pxPanel}>
      <div style={{ ...pxLabel, color: PX.cyan, marginBottom: 16, fontSize: 8 }}>{title}</div>
      {children}
    </div>
  );
}

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
  const [rulesOpen, setRulesOpen]         = useState(false);

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
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: 28 }}>
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
                fontFamily: PX.fp,
                fontSize: 7,
                letterSpacing: "0.05em",
                padding: "8px 14px",
                border: `2px solid ${active ? PX.cyan : PX.border}`,
                background: active ? "rgba(0,238,255,0.12)" : PX.panel,
                color: active ? PX.cyan : PX.mid,
                cursor: "pointer",
                borderRadius: 0,
                transition: "all 0.1s steps(1)",
                lineHeight: 1.6,
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ── 12-col grid: left(config) + right(strategy + execution) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 20 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Period */}
          <section style={{
            background: PX.panel,
            borderLeft: `4px solid ${PX.border}`,
            padding: "16px 20px",
          }}>
            <div style={{ ...pxLabel, color: PX.cyan, fontSize: 8, marginBottom: 16 }}>■ 기간 설정</div>
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
          <section style={{
            background: PX.panel,
            borderLeft: `4px solid ${PX.pink}`,
            padding: "16px 20px",
            flex: 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ ...pxLabel, color: PX.pink, fontSize: 8, marginBottom: 0 }}>
                ■ 코인 선택 [{selectedCoins.length}/{ALL_COINS.length}]
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[
                { label: "전체 선택", action: selectAll },
                { label: "전체 해제", action: deselectAll },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{
                  fontFamily: PX.fp, fontSize: 7,
                  padding: "5px 10px",
                  border: `2px solid ${PX.border}`,
                  background: "transparent",
                  color: PX.mid,
                  cursor: "pointer",
                  borderRadius: 0,
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
              {ALL_COINS.map((coin) => {
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
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Strategy rules (collapsible) */}
          <section style={{ border: `2px solid ${PX.border}`, background: PX.panel, flex: 1 }}>
            <button
              onClick={() => setRulesOpen((o) => !o)}
              style={{
                width: "100%", padding: "14px 24px",
                background: "transparent", border: "none",
                cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.cyan, letterSpacing: "0.06em" }}>
                ■ 전략 상세 규칙
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.mid, background: PX.alt, padding: "2px 8px" }}>
                  v2.4.0_STABLE
                </span>
                <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid }}>
                  {rulesOpen ? "▲" : "▼"}
                </span>
              </div>
            </button>

          {rulesOpen && (
            <div style={{ padding: "0 24px 20px", fontFamily: PX.fb, fontSize: 13, color: PX.white, lineHeight: 1.8 }}>
              <div style={{ height: 1, background: PX.border, opacity: 0.4, marginBottom: 20 }} />

              {strategy === "rsi_divergence" ? (
                <>
                  <RuleBlock title="진입 조건 — 4중 필터 (1H 봉)">
                    <li><b>RSI 상승 다이버전스</b> — 가격 Lower Low + RSI Higher Low (최소 하나 RSI &lt; 30)</li>
                    <li><b>BB 회귀</b> — BB(20, 2σ) 하단 터치/이탈 후 밴드 내부 복귀 종가</li>
                    <li><b>RSI W-Pattern</b> — RSI 30 미만 → 30선 상향 재돌파 (과매도 탈출 확정)</li>
                    <li><b>캔들 반전</b> — 망치형(Hammer) 또는 상승 장악형 양봉 (직전 음봉 50%+ 커버)</li>
                    <li>조건 확정된 봉 마감 직후, 다음 봉 시가에 진입</li>
                  </RuleBlock>
                  <RuleBlock title="위험 회피 필터">
                    <li>5분 내 3%+ 급변 → 60분 쿨다운 (변동성 폭발)</li>
                    <li>RSI 30 이하 10봉+ 연속 → 진입 금지 (RSI 침수)</li>
                    <li>BTC 1H -5%+ 급락 시 → 알트코인 Long 금지 (BTC 가드)</li>
                    <li>가격이 1H 200 EMA 대비 -10% 이상 이격 → 진입 금지 (데드 존)</li>
                  </RuleBlock>
                  <RuleBlock title="청산 규칙 (1m 봉)">
                    <li><span style={{ color: PX.red }}>SL</span> — 다이버전스 최근 저가 - 0.5%</li>
                    <li><span style={{ color: PX.cyan }}>TP1 (50%)</span> — RSI ≥ 70 또는 손익비 1.5배 도달 → 본절로스 이동</li>
                    <li><span style={{ color: PX.green }}>TP2 (50%)</span> — 15m 200 EMA 터치 시 전량 청산</li>
                  </RuleBlock>
                </>
              ) : strategy === "ema_trend" ? (
                <>
                  <RuleBlock title="추세 확인 (1H 봉)">
                    <li><span style={{ color: PX.green }}>Long</span> — 50 EMA &gt; 200 EMA 정배열 (골든크로스)</li>
                    <li><span style={{ color: PX.red }}>Short</span> — 50 EMA &lt; 200 EMA 역배열 (데드크로스)</li>
                    <li>ADX(14) ≥ 25 — 추세 강도 확인</li>
                    <li>No-Trade Zone: ADX &lt; 20 또는 50/200 EMA 간격 &lt; 0.5% (Whipsaw)</li>
                  </RuleBlock>
                  <RuleBlock title="진입 조건 (15m 봉)">
                    <li><span style={{ color: PX.green }}>Long</span> — 15m 가격이 50 EMA로 눌림목 형성 후 재돌파</li>
                    <li><span style={{ color: PX.red }}>Short</span> — 15m 가격이 50 EMA 위로 반등 후 재이탈</li>
                    <li>현재 거래량 &gt; 최근 20봉 평균 거래량</li>
                    <li>다음 봉 시가에 진입</li>
                  </RuleBlock>
                  <RuleBlock title="청산 규칙">
                    <li><span style={{ color: PX.red }}>SL</span> — 15m 200 EMA 이탈 (동적 추적)</li>
                    <li><span style={{ color: PX.cyan }}>TP1 (Long)</span> — 손익비 1:2 지점 → 50% 청산</li>
                    <li><span style={{ color: PX.cyan }}>TP1 (Short)</span> — 손익비 1:1.5 지점 → 50% 청산</li>
                    <li><b>BE</b> — TP1 체결 즉시, 잔여 50% 손절가를 진입가로 이동</li>
                    <li><span style={{ color: PX.green }}>EMA Cross</span> — 15m EMA 역크로스 시 전량 청산</li>
                  </RuleBlock>
                  <RuleBlock title="위험 회피 필터">
                    <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                    <li>15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힌 경우 → 진입 금지</li>
                    <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                    <li>5분 내 3%+ 급등/급락 발생 → 해당 심볼 60분 쿨다운</li>
                    <li>BTC 1H 수익률 -5% 이하 → 알트코인 Long 진입 금지</li>
                  </RuleBlock>
                </>
              ) : (
                <>
                  <RuleBlock title="스퀘즈 확인 (15m 봉)">
                    <li>BB Width(20, 2σ)가 최근 100봉 중 하위 20% = 응축 구간</li>
                    <li>스퀘즈 상태가 최소 15봉 이상 지속된 후의 돌파만 유효</li>
                  </RuleBlock>
                  <RuleBlock title="진입 조건 (15m 봉)">
                    <li><span style={{ color: PX.green }}>Long</span> — 종가 &gt; BB 상단 + 거래량 ≥ 평균의 200% + 하단 밴드 하락 확인</li>
                    <li><span style={{ color: PX.red }}>Short</span> — 종가 &lt; BB 하단 + 거래량 ≥ 평균의 250%</li>
                    <li>다음 봉 시가에 진입</li>
                  </RuleBlock>
                  <RuleBlock title="청산 규칙 (1m 봉)">
                    <li><span style={{ color: PX.red }}>SL</span> — BB 중심선 (20 SMA) 터치 시 전량 청산</li>
                    <li><span style={{ color: "#c084fc" }}>Long TRAIL</span> — 수익 발생 후 밴드 안쪽 복귀 시 트레일링 스탑 (고점 -1% 또는 중심선)</li>
                    <li><span style={{ color: PX.green }}>Short TP</span> — 고정 수익률 +3.5% 도달 시 즉시 청산</li>
                  </RuleBlock>
                  <RuleBlock title="위험 회피 필터">
                    <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                    <li>15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힌 경우 → 진입 금지</li>
                    <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                    <li>BB 상단 돌파 시 하단 밴드 기울기가 양수 → Long 진입 금지</li>
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
          )}
          </section>

          {/* ── Execution section ── */}
          <section style={{
            background: PX.black,
            border: `2px solid rgba(51,85,255,0.3)`,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Results grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "TOTAL_TRADES", val: "--" },
                { label: "WIN_RATE", val: "--%"},
                { label: "PROFIT_FACTOR", val: "0.00" },
                { label: "NET_PROFIT", val: "$0.00" },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: PX.panel, padding: "10px 14px" }}>
                  <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.mid, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: PX.fm, fontSize: 18, fontWeight: 700, color: PX.white }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Run button + progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={handleRun}
                disabled={loading}
                style={{
                  fontFamily: PX.fp, fontSize: 9, letterSpacing: "0.1em",
                  padding: "14px 28px",
                  border: `3px solid ${loading ? PX.mid : PX.cyan}`,
                  background: loading ? PX.alt : "transparent",
                  color: loading ? PX.mid : PX.cyan,
                  cursor: loading ? "not-allowed" : "pointer",
                  borderRadius: 0,
                  transition: "all 0.1s steps(1)",
                  textShadow: loading ? "none" : `0 0 10px ${PX.cyan}`,
                  boxShadow: loading ? "none" : `0 0 20px rgba(0,238,255,0.4)`,
                  whiteSpace: "nowrap" as const,
                }}
              >
                {loading ? "▶▶ 실행 중..." : "▶ 백테스트 실행"}
              </button>

              {loading && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.mid }}>{status || "INITIALIZING BACKTEST ENGINE..."}</span>
                    <span style={{ fontFamily: PX.fm, fontSize: 13, color: PX.cyan, fontWeight: 700 }}>{progress}%</span>
                  </div>
                  {/* Neon progress bar */}
                  <div style={{ height: 16, background: PX.alt, border: `1px solid rgba(51,85,255,0.4)`, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, #0a0a2e 0%, #4b0082 50%, ${PX.cyan} 100%)`,
                      boxShadow: `inset 0 0 10px rgba(0,238,255,0.5), 0 0 15px rgba(75,0,130,0.4)`,
                      transition: "width 0.3s ease-out",
                    }} />
                  </div>
                </div>
              )}
            </div>

            {!loading && status && (
              <span style={{ fontFamily: PX.fb, fontSize: 13, color: PX.mid }}>{status}</span>
            )}
          </section>

        </div>{/* end right column */}
      </div>{/* end 12-col grid */}
    </div>
  );
}

/* ── Rule block helper ───────────────────────────────────────────────────── */
function RuleBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)",
        fontSize: 7,
        color: "var(--px-cyan,#00eeff)",
        marginBottom: 10,
        letterSpacing: "0.06em",
      }}>
        › {title}
      </div>
      <ul style={{ paddingLeft: 20, margin: 0, listStyle: "disc", color: "var(--px-grey-mid,#8888aa)" }}>
        {children}
      </ul>
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
