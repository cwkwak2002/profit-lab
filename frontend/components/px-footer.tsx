"use client";

/**
 * @component PxFooter
 * @description Shared pixel-retro footer used across all Profit Lab pages.
 * @design-credit Frontend design by angrybear
 */
import { PX, DESIGN_ATTRIBUTION } from "@/design-system/tokens/px";

const NAV = [
  { label: "Strategy Backtest", href: "/backtest" },
  { label: "Live Benchmark",    href: "/benchmark/models" },
];

const ENGINES = ["RSI Divergence", "EMA Trend", "BB Squeeze", "Risk Filter v2"];

const STATUS_ITEMS = [
  { label: "API",       status: "ONLINE",  color: PX.green },
  { label: "BACKTEST",  status: "READY",   color: PX.blue },
  { label: "BENCHMARK", status: "LIVE",    color: PX.yellow },
  { label: "DATA FEED", status: "ACTIVE",  color: PX.green },
];

export function PxFooter() {
  return (
    <footer data-design={DESIGN_ATTRIBUTION} style={{ marginTop: 48, borderTop: "1px solid var(--px-border)", position: "relative", overflow: "hidden" }}>
      {/* Body */}
      <div style={{ background: PX.black, padding: "32px 32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32 }}>

          {/* Brand */}
          <div>
            <div style={{
              fontFamily: PX.fb, fontSize: 11, color: PX.cyan,
              letterSpacing: "0.1em", marginBottom: 10,
              
            }}>
              Profit Lab
            </div>
            <div style={{ fontFamily: PX.fb, fontSize: 13, color: PX.mid, lineHeight: 1.7, maxWidth: 260 }}>
              퀀트 전략 백테스트 &amp; 실시간 벤치마크 플랫폼.<br />
              데이터 기반 알고리즘 트레이딩의 시작.
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {["RSI DIV", "EMA TREND", "BB SQUEEZE"].map((tag) => (
                <span key={tag} style={{
                  fontFamily: PX.fb, fontSize: 11,
                  padding: "3px 8px",
                  border: "1px solid rgba(94,106,210,0.4)",
                  color: PX.mid,
                  letterSpacing: "0.04em",
                }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* System nav */}
          <div>
            <div style={{ fontFamily: PX.fb, fontSize: 12, color: PX.blue, letterSpacing: "0.08em", marginBottom: 14 }}>
              SYSTEM
            </div>
            {NAV.map(({ label, href }) => (
              <a key={label} href={href} style={{
                display: "block", marginBottom: 9,
                fontFamily: PX.fb, fontSize: 12, color: PX.mid,
                textDecoration: "none",
                transition: "color 0.1s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.cyan; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.mid; }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Engine */}
          <div>
            <div style={{ fontFamily: PX.fb, fontSize: 12, color: PX.blue, letterSpacing: "0.08em", marginBottom: 14 }}>
              ENGINE
            </div>
            {ENGINES.map((item) => (
              <div key={item} style={{ marginBottom: 9, fontFamily: PX.fb, fontSize: 12, color: PX.mid }}>
                {item}
              </div>
            ))}
          </div>

          {/* Status */}
          <div>
            <div style={{ fontFamily: PX.fb, fontSize: 12, color: PX.blue, letterSpacing: "0.08em", marginBottom: 14 }}>
              STATUS
            </div>
            {STATUS_ITEMS.map(({ label, status, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                <span style={{ fontFamily: PX.fb, fontSize: 11, color: PX.mid }}>{label}</span>
                <span style={{
                  fontFamily: PX.fb, fontSize: 11, color,
                  letterSpacing: "0.05em",
                  
                }}>{status}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Divider */}
        <div style={{ maxWidth: 1100, margin: "24px auto 0", borderTop: "1px solid rgba(94,106,210,0.15)" }} />

        {/* Bottom bar */}
        <div style={{ maxWidth: 1100, margin: "16px auto 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
          <span style={{ fontFamily: PX.fb, fontSize: 12, color: PX.blue, letterSpacing: "0.06em" }}>
            Profit Lab v{process.env.APP_VERSION}
          </span>
          <span style={{ fontFamily: PX.fb, fontSize: 10, color: PX.dim, letterSpacing: "0.04em" }}>
            © 2025 Profit Lab · 연구 목적 · 투자 자문 아님
          </span>
        </div>
      </div>
    </footer>
  );
}
