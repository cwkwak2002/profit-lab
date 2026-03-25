"use client";

/**
 * @component PxFooter
 * @description Shared pixel-retro footer used across all Profit Lab pages.
 * @design-credit Frontend design by angrybear
 */
import { PX, DESIGN_ATTRIBUTION } from "@/design-system/tokens/px";

const NAV = [
  { label: "전략 검증",  href: "/backtest" },
  { label: "주문 입력",  href: "/benchmark" },
  { label: "리더보드",   href: "/benchmark/models" },
];

const ENGINES = ["RSI Divergence", "EMA Trend", "BB Squeeze", "Risk Filter v2"];

const STATUS_ITEMS = [
  { label: "API",       status: "ONLINE",  color: "#00ff7f" },
  { label: "BACKTEST",  status: "READY",   color: "#00eeff" },
  { label: "BENCHMARK", status: "LIVE",    color: "#ffe000" },
  { label: "DATA FEED", status: "ACTIVE",  color: "#00ff7f" },
];

export function PxFooter() {
  return (
    <footer data-design={DESIGN_ATTRIBUTION} style={{ marginTop: 48, borderTop: "1px solid rgba(51,85,255,0.25)", position: "relative", overflow: "hidden" }}>
      {/* Accent bar */}
      <div style={{
        height: 3,
        background: "linear-gradient(90deg, transparent 0%, #3355ff 20%, #8a2be2 50%, #00eeff 80%, transparent 100%)",
      }} />

      {/* Body */}
      <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", padding: "32px 32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32 }}>

          {/* Brand */}
          <div>
            <div style={{
              fontFamily: PX.fp, fontSize: 11, color: PX.cyan,
              letterSpacing: "0.1em", marginBottom: 10,
              textShadow: `0 0 12px ${PX.cyan}`,
            }}>
              ◈ PROFIT LAB
            </div>
            <div style={{ fontFamily: PX.fb, fontSize: 13, color: PX.mid, lineHeight: 1.7, maxWidth: 260 }}>
              퀀트 전략 백테스트 &amp; 실시간 벤치마크 플랫폼.<br />
              데이터 기반 알고리즘 트레이딩의 시작.
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {["RSI DIV", "EMA TREND", "BB SQUEEZE"].map((tag) => (
                <span key={tag} style={{
                  fontFamily: PX.fm, fontSize: 9,
                  padding: "3px 8px",
                  border: "1px solid rgba(51,85,255,0.4)",
                  color: PX.mid,
                  letterSpacing: "0.04em",
                }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* System nav */}
          <div>
            <div style={{ fontFamily: PX.fp, fontSize: 7, color: PX.border, letterSpacing: "0.08em", marginBottom: 14 }}>
              SYSTEM
            </div>
            {NAV.map(({ label, href }) => (
              <a key={label} href={href} style={{
                display: "block", marginBottom: 9,
                fontFamily: PX.fm, fontSize: 12, color: PX.mid,
                textDecoration: "none",
                transition: "color 0.1s steps(1)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.cyan; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.mid; }}
              >
                › {label}
              </a>
            ))}
          </div>

          {/* Engine */}
          <div>
            <div style={{ fontFamily: PX.fp, fontSize: 7, color: PX.border, letterSpacing: "0.08em", marginBottom: 14 }}>
              ENGINE
            </div>
            {ENGINES.map((item) => (
              <div key={item} style={{ marginBottom: 9, fontFamily: PX.fm, fontSize: 12, color: PX.mid }}>
                ▸ {item}
              </div>
            ))}
          </div>

          {/* Status */}
          <div>
            <div style={{ fontFamily: PX.fp, fontSize: 7, color: PX.border, letterSpacing: "0.08em", marginBottom: 14 }}>
              STATUS
            </div>
            {STATUS_ITEMS.map(({ label, status, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                <span style={{ fontFamily: PX.fm, fontSize: 11, color: PX.mid }}>{label}</span>
                <span style={{
                  fontFamily: PX.fp, fontSize: 6, color,
                  letterSpacing: "0.05em",
                  textShadow: `0 0 6px ${color}`,
                }}>{status}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Divider */}
        <div style={{ maxWidth: 1100, margin: "24px auto 0", borderTop: "1px solid rgba(51,85,255,0.15)" }} />

        {/* Bottom bar */}
        <div style={{ maxWidth: 1100, margin: "16px auto 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
          <span style={{ fontFamily: PX.fp, fontSize: 7, color: PX.border, letterSpacing: "0.06em" }}>
            PROFIT LAB // v2.4.0_STABLE
          </span>
          <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.dim, letterSpacing: "0.04em" }}>
            © 2025 PROFIT LAB · FOR RESEARCH PURPOSES ONLY · NOT FINANCIAL ADVICE
          </span>
        </div>
      </div>
    </footer>
  );
}
