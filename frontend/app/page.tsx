"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBenchmarkModels, type BenchmarkModel } from "@/lib/api";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:      "#010102",            // Linear canvas
  panel:   "#0f1011",            // Linear surface-1
  border:  "#23252a",            // Linear hairline
  cyan:    "#5e6ad2",            // → lavender accent
  pink:    "#7a7fad",            // → muted lavender
  yellow:  "#828fff",            // → lavender hover
  green:   "#27a644",            // success (profit)
  red:     "#e5484d",            // loss
  white:   "#f7f8f8",            // ink
  gray:    "#8a8f98",            // ink-subtle
  fp:      "'Inter', sans-serif",
  fm:      "'JetBrains Mono', monospace",
  fb:      "'Inter', Pretendard, sans-serif",
} as const;



/* ── Interstellar gradient bar ──────────────────────────────────────────── */
function GradBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, width: "100%", background: C.panel }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: C.cyan,
      }} />
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [models, setModels] = useState<BenchmarkModel[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [btnHovered, setBtnHovered] = useState<number | null>(null);

  useEffect(() => {
    getBenchmarkModels()
      .then(({ models: data }) => {
        const sorted = [...data].sort((a, b) => b.cumulative_pnl - a.cumulative_pnl);
        setModels(sorted.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const fallback = [
    { id: "1", name: "QUANT_X_9",    cumulative_pnl: 412, win_rate: 90 },
    { id: "2", name: "CYBER_TRADER", cumulative_pnl: 388, win_rate: 82 },
    { id: "3", name: "NEON_DEV",     cumulative_pnl: 310, win_rate: 65 },
  ] as BenchmarkModel[];
  const rows = models.length > 0 ? models : fallback;

  return (
    <>
    <style>{`
      @keyframes robot-motion {
        0%, 60%, 100% { transform: translateX(0) rotate(0deg); }
        15% { transform: translateX(-5px) rotate(-1deg); }
        30% { transform: translateX(5px) rotate(1deg); }
        45% { transform: translateX(-3px) rotate(-0.5deg); }
      }
    `}</style>
    <div style={{
      background: C.bg,
      backgroundAttachment: "fixed",
      minHeight: "calc(100vh - 52px)",
      color: C.white,
      margin: "0 -24px -24px",
      position: "relative",
    }}>

      <main style={{ padding: "32px 24px 0" }}>

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 1100, margin: "0 auto 32px",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          background: C.panel,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "56px 48px",
            display: "flex", flexDirection: "column", alignItems: "flex-start",
          }}>
            <div style={{
              display: "inline-block",
              background: "transparent", border: `1px solid ${C.border}`, color: C.gray,
              fontFamily: C.fm, fontSize: 12,
              padding: "4px 12px", borderRadius: 9999, marginBottom: 24,
            }}>
              SYSTEM STATUS · OPTIMIZED
            </div>

            <h1 style={{
              fontFamily: C.fp, fontWeight: 600, fontSize: 56, letterSpacing: "-1.8px",
              lineHeight: 1.1, margin: "0 0 20px", color: C.white,
            }}>
              Trade smarter
            </h1>

            <p style={{
              fontFamily: C.fb, fontSize: 18, color: C.gray,
              lineHeight: 1.6, maxWidth: 520, margin: "0 0 32px",
            }}>
              전략 백테스트 + AI 모델 벤치마크. 당신의 트레이딩 전략을 검증하고,
              AI와 수익률을 겨루어 보세요.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/backtest" style={{
                fontFamily: C.fb, fontSize: 14, fontWeight: 500,
                padding: "10px 18px", borderRadius: 8,
                background: C.cyan, color: "#fff",
                textDecoration: "none", display: "inline-block",
              }}>
                백테스트 실행
              </Link>
              <Link href="/benchmark/models" style={{
                fontFamily: C.fb, fontSize: 14, fontWeight: 500,
                padding: "10px 18px", borderRadius: 8,
                border: `1px solid ${C.border}`, color: C.white,
                textDecoration: "none", display: "inline-block",
                background: "transparent",
              }}>
                리더보드
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3 FEATURE CARDS ───────────────────────────────────────── */}
        <section style={{
          maxWidth: 1100, margin: "0 auto 32px",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 32,
        }}>

          {/* Card 1: BACKTEST ENGINE */}
          <div
            onMouseEnter={() => setHovered(0)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 0 ? `rgba(94,106,210,0.1)` : C.panel,
              
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "32px 28px",
              transition: "background 0.1s ease",
              display: "flex", flexDirection: "column",
            }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 36, color: C.yellow,
                  fontVariationSettings: "'FILL' 1",
                }}>history</span>
                <h2 style={{ fontFamily: C.fp, fontSize: 11, color: C.cyan, margin: 0, letterSpacing: 1, lineHeight: 1.4 }}>
                  BACKTEST ENGINE
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
                {[
                  { label: "DATA_SET",  val: "BTC/USDT_1H_2024" },
                  { label: "STRATEGY", val: "RSI_DIV / EMA_TREND" },
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    background: "rgba(0,0,0,0.35)",
                    padding: "10px 14px",
                    borderBottom: `1px solid rgba(94,106,210,0.25)`,
                  }}>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.gray, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: C.fp, fontSize: 9, color: C.white }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div style={{
                height: 80, background: "rgba(0,0,0,0.35)",
                display: "flex", alignItems: "flex-end", gap: 3,
                padding: "6px 8px", marginBottom: 20,
                border: `1px solid rgba(94,106,210,0.2)`,
              }}>
                {[25, 40, 60, 100, 80, 67].map((h, i) => (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 3
                      ? C.border
                      : `rgba(94,106,210,${0.3 + i * 0.1})`,
                    boxShadow: i === 3 ? `0 0 15px rgba(94,106,210,0.5)` : "none",
                  }} />
                ))}
              </div>
            </div>

            <Link href="/backtest"
              onMouseEnter={() => setBtnHovered(0)}
              onMouseLeave={() => setBtnHovered(null)}
              style={{
                display: "block", textAlign: "center",
                fontFamily: C.fb, fontSize: 14, fontWeight: 500,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 0",
                textDecoration: "none",
                background: btnHovered === 0 ? "rgba(94,106,210,0.12)" : "transparent",
                color: C.white,
                transition: "background 0.15s ease",
              }}>
              시뮬레이션 시작
            </Link>
          </div>

          {/* Card 2: AI INTELLIGENCE */}
          <div
            onMouseEnter={() => setHovered(1)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 1 ? `rgba(94,106,210,0.1)` : C.panel,
              
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "32px 28px",
              transition: "background 0.1s ease",
              display: "flex", flexDirection: "column",
            }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 36, color: C.pink,
                  fontVariationSettings: "'FILL' 1",
                }}>psychology</span>
                <h2 style={{ fontFamily: C.fp, fontSize: 11, color: C.cyan, margin: 0, letterSpacing: 1, lineHeight: 1.4 }}>
                  AI INTELLIGENCE
                </h2>
              </div>

              <div style={{
                position: "relative",
                padding: "18px 16px",
                background: "rgba(0,0,0,0.35)",
                border: `2px dashed rgba(94,106,210,0.4)`,
                marginBottom: 16,
              }}>
                <div style={{
                  position: "absolute", top: -10, right: -8,
                  background: C.pink, fontFamily: C.fp, fontSize: 7,
                  color: "#fff", padding: "3px 7px",
                }}>CRITICAL</div>
                <div style={{ fontFamily: C.fm, fontSize: 10, color: C.cyan, marginBottom: 8 }}>NEURAL_NET_V4.2.1</div>
                <p style={{ fontFamily: C.fb, fontSize: 13, color: C.white, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                  "Current market sentiment suggests a liquidity grab. Positioning for expansion."
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
                {[
                  { label: "CONFIDENCE_SCORE", val: "94.8%", color: C.cyan },
                  { label: "PREDICTION_BIAS",  val: "BULLISH", color: C.pink },
                  { label: "RECURSION_DEPTH",  val: "512_LAYERS", color: C.white },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid rgba(94,106,210,0.2)`,
                    fontFamily: C.fm, fontSize: 10,
                  }}>
                    <span style={{ color: C.gray }}>{label}</span>
                    <span style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/benchmark"
              onMouseEnter={() => setBtnHovered(1)}
              onMouseLeave={() => setBtnHovered(null)}
              style={{
                display: "block", textAlign: "center",
                fontFamily: C.fb, fontSize: 14, fontWeight: 500, color: "#fff",
                background: C.cyan, borderRadius: 8,
                padding: "10px 0",
                textDecoration: "none",
                filter: btnHovered === 1 ? "brightness(1.1)" : "none",
                transition: "filter 0.15s ease",
              }}>
              에이전트 배포
            </Link>
          </div>

          {/* Card 3: LEADERBOARD */}
          <div
            onMouseEnter={() => setHovered(2)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 2 ? `rgba(255,45,120,0.1)` : C.panel,
              
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "32px 28px",
              transition: "background 0.1s ease",
              display: "flex", flexDirection: "column",
            }}>
            <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 36, color: C.yellow,
                fontVariationSettings: "'FILL' 1",
              }}>leaderboard</span>
              <h2 style={{ fontFamily: C.fp, fontSize: 11, color: C.pink, margin: 0, letterSpacing: 1, lineHeight: 1.4 }}>
                LEADERBOARD
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {rows.map((m, i) => {
                const rankLabel = ["01", "02", "03"][i];
                const pnl = m.cumulative_pnl;
                const barPct = Math.max(10, Math.min(100, (pnl / (rows[0]?.cumulative_pnl || 1)) * 90));
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    background: "rgba(0,0,0,0.35)",
                  }}>
                    <div style={{ fontFamily: C.fp, fontSize: 14, color: C.gray, minWidth: 28 }}>{rankLabel}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.fp, fontSize: 9, color: C.white, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                      <div style={{ fontFamily: C.fm, fontSize: 9, color: C.cyan }}>PROFIT: +{pnl.toFixed(0)}%</div>
                    </div>
                    <div style={{ width: 48 }}>
                      <GradBar pct={barPct} />
                    </div>
                  </div>
                );
              })}
            </div>

            </div>

            <Link href="/benchmark/models"
              onMouseEnter={() => setBtnHovered(2)}
              onMouseLeave={() => setBtnHovered(null)}
              style={{
                display: "block", textAlign: "center",
                fontFamily: C.fb, fontSize: 14, fontWeight: 500,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 0",
                textDecoration: "none",
                background: btnHovered === 2 ? "rgba(94,106,210,0.12)" : "transparent",
                color: C.white,
                transition: "background 0.15s ease",
              }}>
              경쟁 참가
            </Link>
          </div>
        </section>

        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 1100, margin: "0 auto 0",
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { label: "TOTAL MANAGED", val: "$4.2B",  color: C.cyan },
              { label: "ACTIVE NODES",  val: "14,291", color: C.cyan },
              { label: "AVG WIN RATE",  val: "72.4%",  color: C.pink },
              { label: "UPTIME",        val: "99.9%",  color: C.yellow },
            ].map(({ label, val, color }, i) => (
              <div key={label} style={{
                textAlign: "center", padding: "24px 16px",
                borderRight: i < 3 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ fontFamily: C.fb, fontSize: 12, fontWeight: 500, color: C.gray, textTransform: "uppercase" as const, letterSpacing: "0.02em", marginBottom: 10 }}>{label}</div>
                <div style={{ fontFamily: C.fm, fontSize: 24, fontWeight: 600, color }}>{val}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        marginTop: 0, padding: "20px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        fontFamily: C.fb, fontSize: 13,
      }}>
        <span style={{ fontFamily: C.fb, fontSize: 14, fontWeight: 600, color: C.white }}>Profit Lab</span>
        <div style={{ display: "flex", gap: 24 }}>
          {["System Status", "Documentation", "API", "Security"].map((l) => (
            <span key={l} style={{ color: C.gray, cursor: "default" }}>{l}</span>
          ))}
        </div>
        <span style={{ color: C.gray }}>© 2025 Profit Lab</span>
      </footer>
    </div>
    </>
  );
}
