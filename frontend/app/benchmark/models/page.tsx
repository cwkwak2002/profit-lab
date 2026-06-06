"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBenchmarkModels, subscribeBenchmarkStream, type BenchmarkModel } from "@/lib/api";
import { PxFooter } from "@/components/px-footer";
import { PxPageShell } from "@/components/px-page-shell";
import { PX } from "@/design-system/tokens/px";
import { useAuth } from "@/design-system/providers/auth-provider";

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, color, accent }: {
  label: string; value: string; sub?: string; color?: string; accent?: string;
}) {
  return (
    <div style={{
      background: PX.panel,
      border: `1px solid ${PX.border}`,
      borderLeft: `3px solid ${accent ?? PX.blue}`,
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <span style={{ fontFamily: PX.fb, fontSize: 12, fontWeight: 500, color: PX.mid, letterSpacing: "0.02em", lineHeight: 1.4, textTransform: "uppercase" as const }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: PX.fm, fontSize: 22, fontWeight: 700, color: color ?? PX.cyan, lineHeight: 1 }}>
          {value}
        </span>
      </div>
      {sub && (
        <span style={{ fontFamily: PX.fb, fontSize: 11, color: PX.white }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ── Rank badge ──────────────────────────────────────────────────────────── */
const RANK_CONFIGS = [
  { color: PX.blue,    bg: "rgba(94,106,210,0.14)",  label: "★" },
  { color: "#c0c6d0",  bg: "rgba(192,198,208,0.10)", label: "♦" },
  { color: "#b98a5e",  bg: "rgba(185,138,94,0.10)",  label: "♣" },
];

/* ── Table header cell ───────────────────────────────────────────────────── */
function TH({ children, align = "left", fontSize = 10 }: { children: React.ReactNode; align?: "left" | "right"; fontSize?: number }) {
  return (
    <th style={{
      fontFamily: PX.fp,
      fontSize,
      color: PX.mid,
      letterSpacing: "0.06em",
      padding: "12px 14px",
      textAlign: align,
      fontWeight: "normal",
      borderBottom: `1px solid var(--px-border,#23252a)`,
      whiteSpace: "nowrap" as const,
    }}>
      {children}
    </th>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function LeaderboardPage() {
  const { guard, isAuthenticated } = useAuth();
  const router = useRouter();
  const [models, setModels] = useState<BenchmarkModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
    const es = subscribeBenchmarkStream(() => loadModels());
    return () => es.close();
  }, []);

  async function loadModels() {
    try {
      const { models: data } = await getBenchmarkModels();
      data.sort((a, b) => b.cumulative_pnl - a.cumulative_pnl);
      setModels(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
        LOADING...
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "80px 0" }}>
        <p style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid, marginBottom: 24, letterSpacing: "0.08em" }}>
          등록된 모델 없음
        </p>
        <button
          onClick={() => guard(() => router.push("/benchmark"))}
          style={{
            fontFamily: PX.fp, fontSize: 8,
            padding: "10px 20px",
            border: `2px solid ${PX.cyan}`,
            background: "rgba(0,238,255,0.08)",
            color: PX.cyan,
            cursor: "pointer",
            borderRadius: 0,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {!isAuthenticated && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>lock</span>}
          ▶ 주문 입력하기
        </button>
      </div>
    );
  }

  const totalModels = models.length;
  const avgReturn   = models.reduce((s, m) => s + ((m.balance - m.seed) / m.seed) * 100, 0) / totalModels;
  const bestModel   = models[0];
  const bestReturn  = ((bestModel.balance - bestModel.seed) / bestModel.seed) * 100;

  return (
    <PxPageShell>
    <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", padding: "32px 24px 0" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: PX.blue }}>emoji_events</span>
          <div>
          <h1 style={{ fontFamily: PX.fp, fontSize: 28, fontWeight: 600, color: PX.white, letterSpacing: "-0.6px", lineHeight: 1.2, marginBottom: 8 }}>
            Live Benchmark
          </h1>
          <p style={{ fontFamily: PX.fb, fontSize: 14, color: PX.mid, margin: 0 }}>
            AI 모델 트레이딩 성과 비교
          </p>
          </div>
        </div>
        <button
          onClick={() => guard(() => router.push("/benchmark"))}
          style={{
            fontFamily: PX.fb, fontSize: 14, fontWeight: 500,
            padding: "9px 16px",
            border: "none",
            background: PX.blue,
            color: "#ffffff",
            cursor: "pointer",
            borderRadius: 8,
            transition: "background 0.15s ease",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {!isAuthenticated && <span className="material-symbols-outlined" style={{ fontSize: 15 }}>lock</span>}
          + 주문 입력
        </button>
      </div>

      {/* ── Summary metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 24 }}>
        <MetricCard label="참여 모델" value={`${totalModels}`} accent={PX.border} />
        <MetricCard
          label="평균 수익률"
          value={`${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`}
          color={avgReturn >= 0 ? PX.green : PX.red}
          accent={avgReturn >= 0 ? PX.green : PX.red}
        />
        <MetricCard
          label="최고 수익률"
          value={`${bestReturn >= 0 ? "+" : ""}${bestReturn.toFixed(1)}%`}
          sub={bestModel.name}
          color={bestReturn >= 0 ? PX.green : PX.red}
          accent={PX.pink}
        />
        <MetricCard
          label="총 주문"
          value={`${models.reduce((s, m) => s + m.total_orders, 0)}`}
          accent={PX.mid}
        />
      </div>

      {/* ── Rankings table ── */}
      <div style={{ border: `1px solid ${PX.border}`, background: PX.panel, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: PX.alt }}>
              <TH>#</TH>
              <TH>모델</TH>
              <TH align="right">잔액</TH>
              <TH align="right">수익률</TH>
              <TH align="right">승률</TH>
              <TH align="right">MDD</TH>
              <TH align="right">Profit Factor</TH>
              <TH align="right">체결률</TH>
              <TH align="right">주문</TH>
            </tr>
          </thead>
          <tbody>
            {models.map((m, idx) => {
              const returnPct = ((m.balance - m.seed) / m.seed) * 100;
              const rankCfg   = RANK_CONFIGS[idx];
              const isTop3    = idx < 3;

              return (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/benchmark/models/${m.id}`)}
                  style={{
                    cursor: "pointer",
                    borderBottom: `1px solid ${PX.border}`,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(94,106,210,0.10)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* rank */}
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 28, height: 28,
                      background: isTop3 ? rankCfg.bg : "transparent",
                      border: isTop3 ? `1px solid ${rankCfg.color}` : "none",
                      borderRadius: "50%",
                      fontFamily: PX.fm, fontSize: 13, fontWeight: 700,
                      color: isTop3 ? rankCfg.color : PX.mid,
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  {/* name */}
                  <td style={{ padding: "11px 14px", fontFamily: PX.fp, fontSize: 9, color: PX.white }}>
                    {m.name}
                  </td>
                  {/* balance */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.white }}>
                    ${m.balance.toFixed(2)}
                  </td>
                  {/* return */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13,
                    color: returnPct > 0 ? PX.green : returnPct < 0 ? PX.red : PX.mid,
                    fontWeight: 700,
                  }}>
                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                  </td>
                  {/* win rate */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.white }}>
                    {m.win_rate.toFixed(1)}%
                  </td>
                  {/* MDD */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.mid }}>
                    {m.mdd.toFixed(1)}%
                  </td>
                  {/* profit factor */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.white }}>
                    {m.profit_factor !== null ? m.profit_factor.toFixed(2) : "—"}
                  </td>
                  {/* fill rate */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.mid }}>
                    {m.fill_rate.toFixed(0)}%
                  </td>
                  {/* orders */}
                  <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: PX.fm, fontSize: 13, color: PX.mid }}>
                    {m.total_orders}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
      <div style={{ flex: 1 }} />
      <PxFooter />
    </PxPageShell>
  );
}
