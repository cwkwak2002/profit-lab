"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBenchmarkModels, type BenchmarkModel } from "@/lib/api";

// ── Design tokens (inline for self-contained home page) ──────────────────
const T = {
  bg:        "var(--px-black)",
  bg2:       "var(--px-panel)",
  navy:      "var(--px-panel-alt)",
  blue:      "var(--px-blue)",
  cyan:      "var(--px-cyan)",
  pink:      "var(--px-pink)",
  yellow:    "var(--px-yellow)",
  green:     "var(--px-green)",
  red:       "var(--px-red)",
  white:     "var(--px-white)",
  gray:      "var(--px-grey-mid)",
  border:    "var(--px-border)",
  pixelFont: "var(--ff-pixel,'Press Start 2P'),monospace",
  monoFont:  "var(--ff-mono,'JetBrains Mono'),monospace",
  sansFont:  "var(--ff-body,Pretendard),sans-serif",
} as const;

// ── Pixel candlestick data ───────────────────────────────────────────────
const BAR_DATA = [
  {h:60,l:30,o:35,c:55,up:true},  {h:70,l:50,o:55,c:65,up:true},
  {h:75,l:55,o:65,c:58,up:false}, {h:65,l:45,o:58,c:50,up:false},
  {h:60,l:35,o:50,c:55,up:true},  {h:70,l:52,o:55,c:68,up:true},
  {h:80,l:60,o:68,c:72,up:true},  {h:85,l:65,o:72,c:70,up:false},
  {h:78,l:58,o:70,c:75,up:true},  {h:88,l:70,o:75,c:85,up:true},
  {h:90,l:72,o:85,c:78,up:false}, {h:82,l:60,o:78,c:65,up:false},
  {h:70,l:48,o:65,c:55,up:false}, {h:65,l:45,o:55,c:62,up:true},
  {h:72,l:55,o:62,c:70,up:true},  {h:78,l:62,o:70,c:75,up:true},
];

const TICKER_ITEMS = [
  "BTC/USDT +2.3%", "ETH/USDT +1.8%", "SOL/USDT +4.1%",
  "RSI DIV WIN RATE 68%", "EMA TREND +24.7%", "BB SQUEEZE ACTIVE",
  "NEW HIGH: 142 TRADES", "PROFIT LAB v0.1.0",
];

const STRATEGIES = [
  {
    id: "rsi_divergence",
    icon: "📉",
    title: "RSI DIVERGENCE",
    desc: "RSI 다이버전스 + 볼린저밴드 재진입 + W패턴으로 반등 신호 포착",
    level: "HARD LV.3",
    pips: [true, true, true, false, false],
    color: T.cyan,
    shadowColor: "#006688",
  },
  {
    id: "ema_trend",
    icon: "📈",
    title: "EMA TREND",
    desc: "EMA50/200 골든크로스 + ADX 추세 확인으로 모멘텀 추종",
    level: "NORMAL LV.2",
    pips: [true, true, false, false, false],
    color: T.yellow,
    shadowColor: "#886600",
  },
  {
    id: "bb_squeeze",
    icon: "🎯",
    title: "BB SQUEEZE",
    desc: "볼린저밴드 압축 후 거래량 폭발 시 브레이크아웃 진입",
    level: "EASY LV.1",
    pips: [true, false, false, false, false],
    color: T.pink,
    shadowColor: "#881144",
  },
];

// ── Sub-components ───────────────────────────────────────────────────────

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      background: T.blue,
      overflow: "hidden",
      padding: "6px 0",
      borderTop: `2px solid ${T.cyan}`,
      borderBottom: `2px solid ${T.cyan}`,
    }}>
      <div style={{
        display: "flex",
        gap: 40,
        whiteSpace: "nowrap",
        width: "max-content",
        animation: "px-ticker-scroll 22s linear infinite",
      }}>
        {items.map((t, i) => {
          const parts = t.split(" ");
          const last = parts[parts.length - 1];
          const isPos = last.startsWith("+");
          const isNeg = last.startsWith("-");
          return (
            <span key={i} style={{ fontFamily: T.pixelFont, fontSize: 7, color: "#fff" }}>
              {(isPos || isNeg)
                ? <>{parts.slice(0, -1).join(" ")}{" "}
                    <span style={{ color: isPos ? T.green : T.red }}>{last}</span>{" ◆"}
                  </>
                : <>{t} ◆</>
              }
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MiniChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maxH = Math.max(...BAR_DATA.map(b => b.h));
    const scale = 120 / maxH;
    BAR_DATA.forEach((b) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = `flex:1;min-width:8px;display:flex;flex-direction:column;justify-content:flex-end;`;
      const wickTop = document.createElement("div");
      wickTop.style.cssText = `width:1px;background:#888;margin:0 auto;height:${(b.h - Math.max(b.o, b.c)) * scale}px`;
      const body = document.createElement("div");
      const bodyH = Math.abs(b.c - b.o) * scale + 2;
      body.style.cssText = `width:100%;height:${bodyH}px;border:1px solid;background:${b.up ? "#00ff7f" : "#ff3333"};border-color:${b.up ? "#00aa55" : "#aa0000"}`;
      const wickBot = document.createElement("div");
      wickBot.style.cssText = `width:1px;background:#888;margin:0 auto;height:${(Math.min(b.o, b.c) - b.l) * scale}px`;
      wrap.appendChild(wickTop);
      wrap.appendChild(body);
      wrap.appendChild(wickBot);
      el.appendChild(wrap);
    });
  }, []);
  return (
    <div ref={ref} style={{
      width: "100%", height: 140,
      display: "flex", alignItems: "flex-end",
      gap: 3, padding: "0 4px", marginBottom: 12,
    }} />
  );
}

function BlinkingCursor() {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 14,
      background: T.green,
      animation: "px-blink 0.8s steps(1) infinite",
      verticalAlign: "middle",
    }} />
  );
}

function PixelBtn({
  href, children, variant = "primary",
}: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  const base: React.CSSProperties = {
    fontFamily: T.pixelFont,
    fontSize: 9,
    padding: "12px 20px",
    border: "3px solid",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    lineHeight: 1,
    transition: "all 0.1s steps(1)",
  };
  const styles: Record<string, React.CSSProperties> = {
    primary:   { ...base, background: T.blue,      borderColor: T.cyan, color: "#fff", boxShadow: `4px 4px 0 ${T.cyan}` },
    secondary: { ...base, background: "transparent", borderColor: T.pink, color: T.pink, boxShadow: `4px 4px 0 ${T.pink}` },
  };
  return <Link href={href} style={styles[variant]}>{children}</Link>;
}

function StrategyCard({ s }: { s: typeof STRATEGIES[number] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/backtest?strategy=${s.id}`}
      style={{ textDecoration: "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        padding: 20,
        border: `3px solid ${s.color}`,
        boxShadow: hovered
          ? `6px 6px 0 ${s.color}`
          : `4px 4px 0 ${s.color}`,
        background: T.bg2,
        transform: hovered ? "translate(-2px,-2px)" : "none",
        transition: "all 0.1s steps(1)",
        height: "100%",
      }}>
        <div style={{ fontSize: 28, marginBottom: 12, display: "block", lineHeight: 1 }}>{s.icon}</div>
        <div style={{ fontFamily: T.pixelFont, fontSize: 9, color: s.color, marginBottom: 8, letterSpacing: 1 }}>
          {s.title}
        </div>
        <div style={{ fontFamily: T.sansFont, fontSize: 12, color: T.gray, lineHeight: 1.5 }}>
          {s.desc}
        </div>
        <div style={{ marginTop: 12, fontFamily: T.pixelFont, fontSize: 7, color: s.color, display: "flex", gap: 3, alignItems: "center" }}>
          {s.pips.map((on, i) => (
            <div key={i} style={{
              width: 10, height: 10,
              background: on ? s.color : "#1a1a3a",
              border: `1px solid ${on ? s.shadowColor : "#334"}`,
            }} />
          ))}
          <span style={{ marginLeft: 4 }}>{s.level}</span>
        </div>
      </div>
    </Link>
  );
}

function LeaderboardRow({
  rank, name, pnl, winPct, isTop,
}: { rank: number; name: string; pnl: number; winPct: number; isTop?: boolean }) {
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  const rankColor = rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : T.yellow;
  const barW = Math.max(0, Math.min(100, winPct));
  const isPos = pnl >= 0;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "36px 1fr 90px 100px",
      gap: 8,
      padding: "8px 8px",
      borderBottom: `1px solid ${T.navy}`,
      alignItems: "center",
      fontFamily: T.pixelFont,
      fontSize: 7,
    }}>
      <span style={{ color: rankColor }}>{rankEmoji}</span>
      <span style={{ color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <span style={{ color: isPos ? T.green : T.red, textAlign: "right" }}>
        {isPos ? "+" : ""}{pnl.toFixed(1)}%
      </span>
      <div>
        <div style={{ height: 8, background: "#111", border: `1px solid ${T.navy}` }}>
          <div style={{ height: "100%", width: `${barW}%`, background: isPos ? T.green : T.red }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Home Page ───────────────────────────────────────────────────────
export default function HomePage() {
  const [models, setModels] = useState<BenchmarkModel[]>([]);

  useEffect(() => {
    getBenchmarkModels()
      .then(({ models: data }) => {
        const sorted = [...data].sort((a, b) => b.cumulative_pnl - a.cumulative_pnl);
        setModels(sorted.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: T.bg, minHeight: "calc(100vh - 52px)", color: T.white, position: "relative", overflow: "hidden", margin: "-24px" }}>

      {/* Star field */}
      <StarField />

      {/* Ticker tape */}
      <TickerTape />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "60px 32px 48px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 40,
        alignItems: "center",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Left */}
        <div>
          <div style={{
            fontFamily: T.pixelFont, fontSize: 8, color: T.gray,
            letterSpacing: 3, marginBottom: 16,
            animation: "px-blink 1.2s steps(1) infinite",
          }}>
            — INSERT COIN TO CONTINUE —
          </div>

          <h1 style={{ fontSize: 36, lineHeight: 1.3, marginBottom: 8, fontFamily: T.pixelFont }}>
            <span style={{
              display: "block",
              color: T.yellow,
              textShadow: `3px 3px 0 #996600, 6px 6px 0 #443300`,
            }}>TRADE</span>
            <span style={{
              display: "block",
              color: T.cyan,
              textShadow: `3px 3px 0 #006688, 6px 6px 0 #003344`,
              marginTop: 4,
            }}>SMARTER</span>
          </h1>

          <p style={{
            fontFamily: T.sansFont, fontSize: 14, color: T.gray,
            margin: "20px 0 28px", lineHeight: 1.7, maxWidth: 400,
          }}>
            전략 백테스트 + AI 모델 벤치마크.<br />
            당신의 트레이딩 전략을 검증하고,<br />
            AI와 수익률을 겨루어 보세요.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <PixelBtn href="/backtest">▶ PLAY NOW</PixelBtn>
            <PixelBtn href="/benchmark/models" variant="secondary">★ RANKINGS</PixelBtn>
          </div>
        </div>

        {/* Right — pixel screen */}
        <div style={{
          aspectRatio: "4/3",
          background: "#000",
          border: `4px solid ${T.blue}`,
          boxShadow: `0 0 0 2px ${T.navy}, 8px 8px 0 ${T.blue}, 0 0 40px rgba(51,85,255,0.3)`,
          padding: 16,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            fontFamily: T.pixelFont, fontSize: 7, color: T.green,
            marginBottom: 12, borderBottom: "1px solid #003300",
            paddingBottom: 8,
          }}>
            PROFIT_LAB.EXE &nbsp;|&nbsp; v0.1.0 &nbsp;|&nbsp; BTC/USDT{" "}
            <BlinkingCursor />
          </div>

          <MiniChart />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, fontFamily: T.pixelFont, fontSize: 6 }}>
            {[
              { label: "RETURN",   val: "+24.7%", color: T.green },
              { label: "WIN RATE", val: "68%",    color: T.green },
              { label: "DRAWDOWN", val: "-8.3%",  color: T.red },
              { label: "TRADES",   val: "142",    color: T.yellow },
              { label: "PROFIT",   val: "+$2,470",color: T.green },
              { label: "STRATEGY", val: "RSI DIV",color: T.yellow },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                background: "#0a0a1a", border: "1px solid #223",
                padding: "6px 8px", textAlign: "center",
              }}>
                <div style={{ color: T.gray, marginBottom: 2 }}>{label}</div>
                <div style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRATEGY SELECT ──────────────────────────────────────────── */}
      <div style={{ textAlign: "center", fontFamily: T.pixelFont, fontSize: 11, color: T.yellow, margin: "0 0 8px", letterSpacing: 3 }}>
        ── SELECT YOUR STRATEGY ──
      </div>
      <div style={{ textAlign: "center", fontFamily: T.sansFont, fontSize: 13, color: T.gray, marginBottom: 32 }}>
        3가지 전략 중 하나를 선택하고 백테스트를 시작하세요
      </div>
      <div style={{
        maxWidth: 1100, margin: "0 auto 64px", padding: "0 32px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
        position: "relative", zIndex: 1,
      }}>
        {STRATEGIES.map((s) => <StrategyCard key={s.id} s={s} />)}
      </div>

      {/* ── AI BENCHMARK SECTION ─────────────────────────────────────── */}
      <div style={{
        background: T.navy,
        borderTop: `3px solid ${T.pink}`,
        borderBottom: `3px solid ${T.pink}`,
        padding: "48px 32px",
        marginBottom: 0,
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 48, alignItems: "center",
        }}>
          {/* Text */}
          <div>
            <span style={{
              display: "inline-block",
              background: T.pink, color: "#fff",
              fontFamily: T.pixelFont, fontSize: 7,
              padding: "4px 8px", marginBottom: 16,
            }}>
              ★ NEW CHALLENGER
            </span>
            <h2 style={{
              fontFamily: T.pixelFont, fontSize: 18,
              color: T.white, textShadow: `2px 2px 0 ${T.pink}`,
              marginBottom: 16, lineHeight: 1.6,
            }}>
              AI 모델과<br />수익률을 겨루다
            </h2>
            <p style={{ fontFamily: T.sansFont, fontSize: 13, color: T.gray, lineHeight: 1.7, marginBottom: 24 }}>
              GPT-4, Claude, Gemini 등 AI 모델들이<br />
              실제 시장에서 내린 트레이딩 판단을 검증합니다.<br />
              당신의 전략이 AI를 이길 수 있을까요?
            </p>
            <PixelBtn href="/benchmark/models" variant="secondary">★ LEADERBOARD 보기</PixelBtn>
          </div>

          {/* Leaderboard */}
          <div style={{
            border: `3px solid ${T.pink}`,
            boxShadow: `4px 4px 0 ${T.pink}`,
            background: T.bg2,
            padding: 16,
          }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr 90px 100px",
              gap: 8,
              color: T.gray,
              padding: "6px 8px",
              borderBottom: `2px solid ${T.pink}`,
              marginBottom: 4,
              fontFamily: T.pixelFont, fontSize: 7,
            }}>
              <span>#</span><span>MODEL</span><span style={{ textAlign: "right" }}>RETURN</span><span>WIN%</span>
            </div>

            {models.length > 0 ? (
              models.map((m, i) => (
                <LeaderboardRow
                  key={m.id}
                  rank={i + 1}
                  name={m.name}
                  pnl={m.cumulative_pnl}
                  winPct={m.win_rate ?? 50}
                  isTop={i === 0}
                />
              ))
            ) : (
              /* Static fallback while loading or when empty */
              [
                { rank: 1, name: "GPT-4o",      pnl: 31.2, winPct: 78 },
                { rank: 2, name: "Claude 3.7",  pnl: 28.8, winPct: 72 },
                { rank: 3, name: "Gemini Pro",  pnl: 19.4, winPct: 48 },
                { rank: 4, name: "Llama 3.1",   pnl: -4.1, winPct: 10 },
              ].map((r) => (
                <LeaderboardRow key={r.rank} {...r} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `3px solid ${T.blue}`,
        padding: "24px 32px",
        textAlign: "center",
        fontFamily: T.pixelFont,
        fontSize: 7,
        color: T.gray,
        background: T.navy,
      }}>
        <div style={{ fontSize: 16, letterSpacing: 4, marginBottom: 12 }}>
          ⬛🟨⬛ &nbsp; ⬛🟦⬛ &nbsp; ⬛🟥⬛
        </div>
        <div>
          <span style={{ color: T.yellow }}>PROFIT LAB</span>
          {" "}|{" "}© 2025{" "}|{" "}
          <span style={{ color: T.cyan }}>Made with ♥ &amp; 8 bits</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 6 }}>
          ALL TRADING IS SIMULATED · NOT FINANCIAL ADVICE · PRESS START TO PLAY
        </div>
      </footer>
    </div>
  );
}

// ── Star field (client-only) ─────────────────────────────────────────────
function StarField() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("div");
      const sz = Math.random() < 0.7 ? 1 : 2;
      const delay = (Math.random() * 4).toFixed(1);
      const dur   = (2 + Math.random() * 4).toFixed(1);
      s.style.cssText = `
        position:absolute;
        width:${sz}px;height:${sz}px;
        background:#fff;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation:px-twinkle ${dur}s ease-in-out ${delay}s infinite;
      `;
      el.appendChild(s);
    }
  }, []);
  return (
    <div ref={ref} style={{
      position: "fixed", inset: 0,
      pointerEvents: "none", zIndex: 0, overflow: "hidden",
    }} />
  );
}
