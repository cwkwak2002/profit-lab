"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CoinSummaryTable } from "@/components/coin-summary-table";
import {
  getBacktestSummary,
  getBacktestCoins,
  type BacktestSummary,
  type CoinSummary,
} from "@/lib/api";
import { PxFooter } from "@/components/px-footer";
import { PX } from "@/design-system/tokens/px";

const STRATEGY_LABELS: Record<string, string> = {
  rsi_divergence: "RSI DIV",
  ema_trend:      "EMA TREND",
  bb_squeeze:     "BB SQUEEZE",
};

function MetricCard({ label, value, color, accent, sub }: {
  label: string; value: string; color?: string; accent?: string; sub?: string;
}) {
  return (
    <div style={{
      background: "#1e1e2f",
      borderLeft: `4px solid ${accent ?? PX.border}`,
      padding: "14px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
        {label}
      </span>
      <span style={{ fontFamily: PX.fm, fontSize: 22, fontWeight: 700, color: color ?? PX.cyan, lineHeight: 1 }}>
        {value}
      </span>
      {sub && <span style={{ fontFamily: PX.fb, fontSize: 11, color: PX.mid }}>{sub}</span>}
    </div>
  );
}

export default function BacktestResultPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [coins, setCoins] = useState<CoinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!runId) return;
    async function load() {
      try {
        const [summaryData, coinsData] = await Promise.all([
          getBacktestSummary(runId),
          getBacktestCoins(runId),
        ]);
        setSummary(summaryData);
        setCoins(coinsData.coins);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
      LOADING...
    </div>
  );
  if (error) return (
    <div style={{ textAlign: "center", padding: "80px 0", fontFamily: PX.fp, fontSize: 8, color: PX.red, letterSpacing: "0.08em" }}>
      ERROR: {error}
    </div>
  );
  if (!summary) return null;

  const { aggregate, run } = summary;
  const strategyLabel = STRATEGY_LABELS[run.params?.strategy as string] || "BACKTEST";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "0 -24px -24px" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 24px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: PX.fp, fontSize: 20, color: PX.yellow, letterSpacing: 2, lineHeight: 1,
            textShadow: "2px 2px 0 #886600, 4px 4px 0 #443300", marginBottom: 14,
          }}>
            ◀ 백테스트 결과
          </h1>
          <p style={{ fontFamily: PX.fb, fontSize: 14, color: PX.mid, margin: 0 }}>
            {strategyLabel} &nbsp;·&nbsp; {run.start_date} ~ {run.end_date} &nbsp;·&nbsp; {run.coins.length}개 코인
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/backtest")}
            style={{
              fontFamily: PX.fp, fontSize: 8, color: PX.cyan,
              background: "transparent", border: "none",
              cursor: "pointer", letterSpacing: "0.06em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = PX.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = PX.cyan; }}
          >
            ← 전략 검증
          </button>
          <span style={{ fontFamily: PX.fm, fontSize: 10, color: PX.dim, background: PX.alt, padding: "4px 10px", border: `1px solid ${PX.border}`, alignSelf: "center" }}>
            RUN {run.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* ── Summary metric cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
        <MetricCard
          label="총 거래수"
          value={`${aggregate.total_trades}`}
          accent={PX.border}
        />
        <MetricCard
          label="평균 승률"
          value={`${aggregate.avg_win_rate}%`}
          color={aggregate.avg_win_rate >= 50 ? PX.green : PX.red}
          accent={aggregate.avg_win_rate >= 50 ? PX.green : PX.red}
        />
        <MetricCard
          label="평균 수익률"
          value={`${aggregate.avg_return >= 0 ? "+" : ""}${aggregate.avg_return}%`}
          color={aggregate.avg_return >= 0 ? PX.green : PX.red}
          accent={aggregate.avg_return >= 0 ? PX.green : PX.red}
        />
        <MetricCard
          label="평균 MDD"
          value={`${aggregate.avg_mdd}%`}
          color={PX.yellow}
          accent={PX.yellow}
        />
      </div>

      {/* ── Coin results table ── */}
      <div style={{ border: `2px solid ${PX.border}`, background: "#1a1a2b" }}>
        {/* Table header */}
        <div style={{
          padding: "12px 20px",
          borderBottom: `2px solid ${PX.border}`,
          background: PX.alt,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.cyan, letterSpacing: "0.06em" }}>
            ■ 코인별 결과
          </span>
          <span style={{ fontFamily: PX.fm, fontSize: 11, color: PX.mid }}>
            {coins.length}개 코인 &nbsp;·&nbsp; 클릭하면 상세 차트로 이동
          </span>
        </div>
        <CoinSummaryTable data={coins} runId={runId} />
      </div>
    </div>
      <div style={{ flex: 1 }} />
      <PxFooter />
    </div>
  );
}
