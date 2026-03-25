"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EquityCurve } from "@/components/equity-curve";
import { TradeTable } from "@/components/trade-table";
import { TradingViewChart } from "@/components/tradingview-chart";
import { ResizableSplit } from "@/components/resizable-split";
import {
  getCoinTrades,
  getBacktestCoins,
  getBacktestSummary,
  type Trade,
  type CoinSummary,
} from "@/lib/api";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const PX = {
  black:  "#0a0a1a",
  panel:  "#12122a",
  alt:    "#1a1a4e",
  border: "#3355ff",
  cyan:   "#00eeff",
  pink:   "#ff2d78",
  yellow: "#ffe000",
  green:  "#00ff7f",
  red:    "#ff3333",
  white:  "#f0f0ff",
  mid:    "#8888aa",
  dim:    "#555577",
  fp:     "'Press Start 2P', monospace",
  fm:     "'JetBrains Mono', monospace",
  fb:     "Pretendard, sans-serif",
} as const;

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, accent }: {
  label: string; value: string; color?: string; accent?: string;
}) {
  return (
    <div style={{
      background: "#1a1a2e",
      borderLeft: `3px solid ${accent ?? PX.border}`,
      padding: "10px 12px",
    }}>
      <div style={{
        fontFamily: PX.fp, fontSize: 6, color: PX.dim,
        letterSpacing: "0.07em", marginBottom: 7,
        textTransform: "uppercase" as const,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: PX.fm, fontSize: 15, fontWeight: 700, color: color ?? PX.white, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function CoinDetailPage() {
  const params  = useParams();
  const runId   = params.id     as string;
  const symbol  = params.symbol as string;

  const [trades,        setTrades]        = useState<Trade[]>([]);
  const [summary,       setSummary]       = useState<CoinSummary | null>(null);
  const [allCoins,      setAllCoins]      = useState<CoinSummary[]>([]);
  const [strategyLabel, setStrategyLabel] = useState("");
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeTab,     setActiveTab]     = useState<"equity" | "chart">("chart");

  useEffect(() => {
    if (!runId || !symbol) return;
    async function load() {
      try {
        const [tradesData, coinsData, summaryData] = await Promise.all([
          getCoinTrades(runId, symbol),
          getBacktestCoins(runId),
          getBacktestSummary(runId),
        ]);
        setTrades(tradesData.trades);
        setAllCoins(coinsData.coins);
        setSummary(coinsData.coins.find((c) => c.symbol === symbol) || null);
        const labels: Record<string, string> = {
          rsi_divergence: "RSI Divergence",
          ema_trend:      "EMA Trend",
          bb_squeeze:     "BB Squeeze",
        };
        setStrategyLabel(labels[summaryData.run.params?.strategy as string] || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId, symbol]);

  const handleTradeClick = useCallback((_trade: Trade) => {}, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh",
      fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.1em" }}>
      LOADING...
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh",
      fontFamily: PX.fp, fontSize: 8, color: PX.red, letterSpacing: "0.08em" }}>
      ERROR: {error}
    </div>
  );

  const ret = summary?.cumulative_return ?? 0;

  return (
    <div style={{
      margin: "0 -24px -24px",
      height: "calc(100vh - 110px)",
      display: "flex",
      flexDirection: "column",
      background: PX.black,
      color: PX.white,
      overflow: "hidden",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 20px",
        background: PX.panel,
        borderBottom: `2px solid ${PX.border}`,
        boxShadow: "0 2px 0 rgba(51,85,255,0.2)",
      }}>
        <Link href={`/backtest/${runId}`} style={{
          fontFamily: PX.fp, fontSize: 7, color: PX.mid,
          textDecoration: "none", letterSpacing: "0.05em",
          display: "flex", alignItems: "center", gap: 6,
          transition: "color 0.1s steps(1)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.cyan; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = PX.mid; }}
        >
          ◀ 결과 요약
        </Link>

        <div style={{ width: 1, height: 18, background: "rgba(51,85,255,0.5)" }} />

        <div style={{
          fontFamily: PX.fp, fontSize: 12, color: PX.cyan,
          letterSpacing: "0.1em", lineHeight: 1,
          textShadow: `0 0 12px ${PX.cyan}`,
        }}>
          {symbol}
        </div>

        {strategyLabel && (
          <div style={{
            fontFamily: PX.fm, fontSize: 11, color: PX.mid,
            padding: "2px 8px",
            border: `1px solid rgba(51,85,255,0.4)`,
            background: "rgba(51,85,255,0.08)",
          }}>
            {strategyLabel}
          </div>
        )}

        {summary && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.dim, letterSpacing: "0.06em", marginBottom: 4 }}>수익률</div>
              <div style={{ fontFamily: PX.fm, fontSize: 14, fontWeight: 700, color: ret >= 0 ? PX.green : PX.red }}>
                {ret >= 0 ? "+" : ""}{ret}%
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(51,85,255,0.3)" }} />
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.dim, letterSpacing: "0.06em", marginBottom: 4 }}>승률</div>
              <div style={{ fontFamily: PX.fm, fontSize: 14, fontWeight: 700, color: summary.win_rate >= 50 ? PX.green : PX.red }}>
                {summary.win_rate}%
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(51,85,255,0.3)" }} />
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.dim, letterSpacing: "0.06em", marginBottom: 4 }}>MDD</div>
              <div style={{ fontFamily: PX.fm, fontSize: 14, fontWeight: 700, color: PX.yellow }}>
                {summary.max_drawdown}%
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(51,85,255,0.3)" }} />
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.dim, letterSpacing: "0.06em", marginBottom: 4 }}>최종잔액</div>
              <div style={{ fontFamily: PX.fm, fontSize: 14, fontWeight: 700, color: PX.white }}>
                ${summary.final_balance.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Body: sidebar + main ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{
          width: 160,
          flexShrink: 0,
          background: PX.panel,
          borderRight: `2px solid rgba(51,85,255,0.25)`,
          overflowY: "auto" as const,
          display: "flex",
          flexDirection: "column" as const,
        }}>
          {/* Coin list header */}
          <div style={{
            padding: "10px 12px 8px",
            borderBottom: `1px solid rgba(51,85,255,0.25)`,
          }}>
            <div style={{ fontFamily: PX.fp, fontSize: 6, color: PX.border, letterSpacing: "0.08em" }}>
              코인 목록
            </div>
          </div>

          {/* Coin links */}
          <div style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column" as const, gap: 2 }}>
            {allCoins.map((c) => {
              const active = c.symbol === symbol;
              const r = c.cumulative_return;
              return (
                <Link
                  key={c.symbol}
                  href={`/backtest/${runId}/coins/${c.symbol}`}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 8px",
                    background: active ? "rgba(0,238,255,0.1)" : "transparent",
                    border: `1px solid ${active ? PX.cyan : "transparent"}`,
                    textDecoration: "none",
                    transition: "all 0.1s steps(1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(51,85,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }}
                >
                  <span style={{ fontFamily: PX.fm, fontSize: 11, fontWeight: 700, color: active ? PX.cyan : PX.mid }}>
                    {c.symbol}
                  </span>
                  <span style={{ fontFamily: PX.fm, fontSize: 10, color: r >= 0 ? PX.green : PX.red }}>
                    {r >= 0 ? "+" : ""}{r}%
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "hidden" }}>
          <ResizableSplit
            top={
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Tab bar */}
                <div style={{
                  flexShrink: 0,
                  display: "flex", gap: 4, alignItems: "center",
                  padding: "8px 14px",
                  background: PX.panel,
                  borderBottom: `2px solid rgba(51,85,255,0.3)`,
                }}>
                  {(["chart", "equity"] as const).map((tab) => {
                    const active = activeTab === tab;
                    const label = tab === "chart" ? "차트" : "수익 곡선";
                    return (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        fontFamily: PX.fp, fontSize: 7, letterSpacing: "0.05em",
                        padding: "6px 14px",
                        border: `2px solid ${active ? PX.cyan : "rgba(51,85,255,0.4)"}`,
                        background: active ? "rgba(0,238,255,0.12)" : "transparent",
                        color: active ? PX.cyan : PX.mid,
                        cursor: "pointer", borderRadius: 0,
                        transition: "all 0.1s steps(1)",
                        lineHeight: 1.6,
                      }}>
                        {label}
                      </button>
                    );
                  })}

                  <div style={{ marginLeft: "auto", fontFamily: PX.fm, fontSize: 10, color: PX.dim }}>
                    {symbol}USDT · PERP
                  </div>
                </div>

                {/* Chart */}
                <div style={{ flex: 1, overflow: "hidden", background: PX.black }}>
                  {activeTab === "equity" ? (
                    trades.length > 0 ? (
                      <EquityCurve trades={trades} initialBalance={100} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
                        fontFamily: PX.fp, fontSize: 8, color: PX.dim, letterSpacing: "0.08em" }}>
                        거래 기록 없음
                      </div>
                    )
                  ) : (
                    <TradingViewChart symbol={symbol} showRsi={false} />
                  )}
                </div>
              </div>
            }
            bottom={
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Trade table header */}
                <div style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 16px",
                  background: PX.alt,
                  borderBottom: `2px solid ${PX.border}`,
                }}>
                  <span style={{ fontFamily: PX.fp, fontSize: 7, color: PX.cyan, letterSpacing: "0.06em" }}>
                    ■ 포지션 상세
                  </span>
                  <span style={{
                    fontFamily: PX.fm, fontSize: 11, color: PX.mid,
                    padding: "1px 8px",
                    border: `1px solid rgba(51,85,255,0.35)`,
                    background: "rgba(51,85,255,0.08)",
                  }}>
                    {trades.length}건
                  </span>
                </div>

                {/* Trade table */}
                <div style={{ flex: 1, overflow: "auto", background: PX.panel }}>
                  <TradeTable
                    data={trades}
                    onRowClick={handleTradeClick}
                    highlightClickable={activeTab === "chart"}
                  />
                </div>
              </div>
            }
          />
        </main>

      </div>
    </div>
  );
}
