"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBenchmarkModels, subscribeBenchmarkStream, type BenchmarkModel } from "@/lib/api";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const PX = {
  panel:   "var(--px-panel,#12122a)",
  alt:     "var(--px-panel-alt,#1a1a4e)",
  border:  "var(--px-border,#3355ff)",
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

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, color, accent }: {
  label: string; value: string; sub?: string; color?: string; accent?: string;
}) {
  return (
    <div style={{
      background: "#1e1e2f",
      borderLeft: `4px solid ${accent ?? PX.border}`,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <span style={{ fontFamily: PX.fp, fontSize: 7, color: PX.mid, letterSpacing: "0.08em", lineHeight: 1.8, textTransform: "uppercase" as const }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: PX.fm, fontSize: 22, fontWeight: 700, color: color ?? PX.cyan, lineHeight: 1 }}>
          {value}
        </span>
      </div>
      {sub && (
        <span style={{ fontFamily: PX.fb, fontSize: 11, color: PX.mid }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ── Rank badge ──────────────────────────────────────────────────────────── */
const RANK_CONFIGS = [
  { color: PX.yellow,   bg: "rgba(255,224,0,0.12)",   label: "★" },
  { color: "#c0c0d0",   bg: "rgba(192,192,208,0.12)", label: "♦" },
  { color: "#cd7f3a",   bg: "rgba(205,127,58,0.12)",  label: "♣" },
];

/* ── Table header cell ───────────────────────────────────────────────────── */
function TH({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{
      fontFamily: PX.fp,
      fontSize: 6,
      color: PX.mid,
      letterSpacing: "0.08em",
      padding: "12px 14px",
      textAlign: align,
      fontWeight: "normal",
      borderBottom: `2px solid var(--px-border,#3355ff)`,
      whiteSpace: "nowrap" as const,
    }}>
      {children}
    </th>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function LeaderboardPage() {
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
          onClick={() => router.push("/benchmark")}
          style={{
            fontFamily: PX.fp, fontSize: 8,
            padding: "10px 20px",
            border: `2px solid ${PX.cyan}`,
            background: "rgba(0,238,255,0.08)",
            color: PX.cyan,
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
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
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: PX.fp, fontSize: 13, color: PX.yellow, letterSpacing: 2, lineHeight: 1,
            textShadow: "2px 2px 0 #886600, 4px 4px 0 #443300", marginBottom: 10 }}>
            ★ AI 리더보드
          </h1>
          <p style={{ fontFamily: PX.fb, fontSize: 13, color: PX.mid, margin: 0 }}>
            AI 모델 트레이딩 성과 비교
          </p>
        </div>
        <button
          onClick={() => router.push("/benchmark")}
          style={{
            fontFamily: PX.fp, fontSize: 7, letterSpacing: "0.06em",
            padding: "10px 18px",
            border: `2px solid ${PX.cyan}`,
            background: "rgba(0,238,255,0.08)",
            color: PX.cyan,
            cursor: "pointer",
            borderRadius: 0,
            transition: "all 0.1s steps(1)",
          }}
        >
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
      <div style={{ border: `2px solid ${PX.border}`, background: "#1a1a2b", overflow: "hidden", padding: 1 }}>
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
                    borderBottom: `1px solid rgba(51,85,255,0.3)`,
                    transition: "background 0.1s steps(1)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(51,85,255,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* rank */}
                  <td style={{ padding: "11px 14px" }}>
                    {isTop3 ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26,
                        background: rankCfg.bg,
                        border: `2px solid ${rankCfg.color}`,
                        fontFamily: PX.fp, fontSize: 7,
                        color: rankCfg.color,
                      }}>
                        {rankCfg.label}
                      </span>
                    ) : (
                      <span style={{ fontFamily: PX.fm, fontSize: 12, color: PX.mid }}>{idx + 1}</span>
                    )}
                  </td>
                  {/* name */}
                  <td style={{ padding: "11px 14px", fontFamily: PX.fb, fontSize: 14, fontWeight: 600, color: PX.white }}>
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
  );
}
