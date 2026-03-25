"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBenchmarkModels, type BenchmarkModel } from "@/lib/api";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:      "#05051e",
  panel:   "rgba(12,12,29,0.6)",
  border:  "#3355ff",
  cyan:    "#00dbeb",
  pink:    "#ff2d78",
  yellow:  "#ffe000",
  green:   "#00ff7f",
  red:     "#ff3333",
  white:   "#e3e0f8",
  gray:    "#8888aa",
  fp:      "'Press Start 2P', monospace",
  fm:      "'JetBrains Mono', monospace",
  fb:      "Pretendard, sans-serif",
} as const;



/* ── Interstellar gradient bar ──────────────────────────────────────────── */
function GradBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, width: "100%", background: "#1a1a3a" }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: `linear-gradient(90deg, ${C.border}, #8a2be2, ${C.cyan})`,
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
      background: `linear-gradient(135deg, #05051e 0%, #1a0b2e 50%, #0c0c1d 100%)`,
      backgroundAttachment: "fixed",
      minHeight: "calc(100vh - 52px)",
      color: C.white,
      margin: "0 -24px -24px",
      position: "relative",
    }}>

      {/* Scanline */}
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.18) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))",
        backgroundSize: "100% 4px, 3px 100%",
        zIndex: 9998, pointerEvents: "none",
      }} />

      <main style={{ padding: "32px 24px 0" }}>

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 1100, margin: "0 auto 32px",
          display: "grid", gridTemplateColumns: "7fr 5fr",
          border: `4px solid ${C.border}`,
          background: C.panel,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          overflow: "hidden",
          boxShadow: `0 0 20px rgba(51,85,255,0.3)`,
        }}>
          {/* Left */}
          <div style={{
            padding: "40px 44px",
            borderRight: `4px solid ${C.border}`,
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{
              display: "inline-block", alignSelf: "flex-start",
              background: C.border, color: "#fff",
              fontFamily: C.fm, fontSize: 10,
              padding: "4px 10px", marginBottom: 20,
            }}>
              SYSTEM_STATUS: OPTIMIZED
            </div>

            <h1 style={{ fontFamily: C.fp, lineHeight: 1.15, margin: "0 0 20px" }}>
              <span style={{
                display: "block", fontSize: 52,
                color: C.white,
                textShadow: `3px 3px 0 ${C.pink}, -2px -2px 0 ${C.cyan}, 0 0 15px rgba(255,45,120,0.6)`,
              }}>TRADE</span>
              <span style={{
                display: "block", fontSize: 52,
                color: C.yellow,
                textShadow: `3px 3px 0 ${C.pink}, -2px -2px 0 ${C.cyan}, 0 0 15px rgba(255,45,120,0.6)`,
              }}>SMARTER</span>
            </h1>

            <p style={{
              fontFamily: C.fm, fontSize: 13, color: C.cyan,
              lineHeight: 1.7, maxWidth: 420, margin: "0 0 28px",
            }}>
              전략 백테스트 + AI 모델 벤치마크.<br />
              당신의 트레이딩 전략을 검증하고,<br />
              AI와 수익률을 겨루어 보세요.
            </p>

            <div style={{ display: "flex", gap: 16 }}>
              <Link href="/backtest" style={{
                fontFamily: C.fp, fontSize: 9, letterSpacing: 1,
                padding: "14px 24px",
                background: C.pink, color: "#fff",
                textDecoration: "none", display: "inline-block",
                boxShadow: `4px 4px 0 #881144`,
              }}>
                RUN_BENCHMARK.EXE
              </Link>
              <Link href="/benchmark/models" style={{
                fontFamily: C.fp, fontSize: 9, letterSpacing: 1,
                padding: "14px 24px",
                border: `2px solid ${C.border}`, color: C.border,
                textDecoration: "none", display: "inline-block",
                background: "transparent",
              }}>
                LEADERBOARD
              </Link>
            </div>
          </div>

          {/* Right — 3D image panel */}
          <div style={{
            background: "#0c0c1d", position: "relative", minHeight: 360,
            overflow: "hidden",
          }}>
            {/* 3D robot image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUpjkXwBIuTCrOrI9xtjpuAn_EOcpXwh1JrOSaznFXXDmFYX_7ETcMuG6Hh9CT1DTK0eYKSejgyCbJ-nf2E4Kd8OA2uCAX-G0n0XkOzE5tV2IBGRsE7DFBtQaQZtuUpC2U-lFbX01Ab7x-XjMNsEGIs6NzteI1rh7bE2IP7942X7P2rVw0tohAMCoF_WzZz3xfSLTz4fSv4BJzucr2tJwK9srXu5Vrx46weogBKfs092IGlaVZtXNk-8jEutMGBBeiBXDjssrJCSTp"
              alt="3D trading robot"
              style={{
                width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0,
                animation: "robot-motion 5s ease-in-out infinite",
              }}
            />

            {/* Overlay stats */}
            <div style={{
              position: "absolute", top: 14, left: 14,
              fontFamily: C.fm, fontSize: 9, lineHeight: 1.8,
            }}>
              <div style={{ color: C.yellow }}>LATENCY: 0.042ms</div>
              <div style={{ color: C.yellow }}>NODE_COUNT: 4,096</div>
              <div style={{ color: C.pink }}>SIGNAL: STRONG</div>
            </div>

            {/* Live feed */}
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              background: "rgba(12,12,29,0.85)", border: `2px solid ${C.pink}`,
              padding: "10px 14px",
            }}>
              <div style={{ fontFamily: C.fp, fontSize: 7, color: C.pink, marginBottom: 6 }}>LIVE_FEED</div>
              <div style={{ fontFamily: C.fm, fontSize: 18, fontWeight: 800, color: C.white }}>
                +12.42% <span style={{ fontSize: 10, color: C.cyan }}>SIGNAL_UP</span>
              </div>
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
              background: hovered === 0 ? `rgba(51,85,255,0.1)` : C.panel,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              borderTop: `8px solid ${C.border}`,
              padding: "32px 28px",
              transition: "background 0.1s steps(1)",
              display: "flex", flexDirection: "column",
            }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 36, color: C.yellow,
                  fontVariationSettings: "'FILL' 1",
                }}>history</span>
                <h2 style={{ fontFamily: C.fp, fontSize: 11, color: C.border, margin: 0, letterSpacing: 1, lineHeight: 1.4 }}>
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
                    borderBottom: `2px solid rgba(51,85,255,0.25)`,
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
                border: `1px solid rgba(51,85,255,0.2)`,
              }}>
                {[25, 40, 60, 100, 80, 67].map((h, i) => (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 3
                      ? `linear-gradient(180deg, ${C.border}, #8a2be2, ${C.cyan})`
                      : `rgba(51,85,255,${0.3 + i * 0.1})`,
                    boxShadow: i === 3 ? `0 0 15px rgba(0,219,235,0.5)` : "none",
                  }} />
                ))}
              </div>
            </div>

            <Link href="/backtest"
              onMouseEnter={() => setBtnHovered(0)}
              onMouseLeave={() => setBtnHovered(null)}
              style={{
                display: "block", textAlign: "center",
                fontFamily: C.fp, fontSize: 9,
                border: `2px solid ${C.yellow}`,
                padding: "12px 0",
                textDecoration: "none",
                background: btnHovered === 0 ? C.yellow : "transparent",
                color: btnHovered === 0 ? "#000" : C.yellow,
              }}>
              START_SIMULATION
            </Link>
          </div>

          {/* Card 2: AI INTELLIGENCE */}
          <div
            onMouseEnter={() => setHovered(1)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 1 ? `rgba(0,219,235,0.1)` : C.panel,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              borderTop: `8px solid ${C.cyan}`,
              padding: "32px 28px",
              transition: "background 0.1s steps(1)",
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
                border: `2px dashed rgba(0,219,235,0.4)`,
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
                    borderBottom: `1px solid rgba(51,85,255,0.2)`,
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
                fontFamily: C.fp, fontSize: 9, color: "#fff",
                background: `linear-gradient(90deg, ${C.border}, #8a2be2, ${C.cyan})`,
                padding: "12px 0",
                textDecoration: "none",
                filter: btnHovered === 1 ? "brightness(1.25)" : "none",
              }}>
              DEPLOY_AGENT.SH
            </Link>
          </div>

          {/* Card 3: LEADERBOARD */}
          <div
            onMouseEnter={() => setHovered(2)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 2 ? `rgba(255,45,120,0.1)` : C.panel,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              borderTop: `8px solid ${C.pink}`,
              padding: "32px 28px",
              transition: "background 0.1s steps(1)",
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
                    <div style={{ fontFamily: C.fp, fontSize: 14, color: "#333355", minWidth: 28 }}>{rankLabel}</div>
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
                fontFamily: C.fp, fontSize: 9,
                border: `2px solid ${C.pink}`,
                padding: "12px 0",
                textDecoration: "none",
                background: btnHovered === 2 ? C.pink : "transparent",
                color: btnHovered === 2 ? "#fff" : C.pink,
              }}>
              ENTER_COMPETITION
            </Link>
          </div>
        </section>

        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 1100, margin: "0 auto 0",
          background: C.panel,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          border: `2px solid rgba(51,85,255,0.3)`,
          boxShadow: `0 0 30px rgba(51,85,255,0.1)`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { label: "TOTAL MANAGED", val: "$4.2B",  color: C.border },
              { label: "ACTIVE NODES",  val: "14,291", color: C.cyan },
              { label: "AVG WIN RATE",  val: "72.4%",  color: C.pink },
              { label: "UPTIME",        val: "99.9%",  color: C.yellow },
            ].map(({ label, val, color }, i) => (
              <div key={label} style={{
                textAlign: "center", padding: "24px 16px",
                borderRight: i < 3 ? `2px solid rgba(51,85,255,0.2)` : "none",
              }}>
                <div style={{ fontFamily: C.fm, fontSize: 9, color: C.gray, textTransform: "uppercase" as const, marginBottom: 10 }}>{label}</div>
                <div style={{ fontFamily: C.fp, fontSize: 20, color }}>{val}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        marginTop: 0, padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(0,0,0,0.6)",
        borderTop: `2px solid rgba(30,30,47,1)`,
        fontFamily: C.fm, fontSize: 10, textTransform: "uppercase" as const,
      }}>
        <span style={{ fontFamily: C.fp, fontSize: 8, color: C.border }}>PROFIT LAB // SYSTEM_READY</span>
        <div style={{ display: "flex", gap: 24 }}>
          {["SYSTEM STATUS", "DOCUMENTATION", "API", "SECURITY"].map((l) => (
            <span key={l} style={{ color: C.gray, cursor: "default" }}>{l}</span>
          ))}
        </div>
        <span style={{ color: C.gray }}>© 2025 PROFIT LAB // SYSTEM_READY</span>
      </footer>
    </div>
    </>
  );
}
