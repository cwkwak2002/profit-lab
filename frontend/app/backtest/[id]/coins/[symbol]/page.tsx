"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function CoinDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const symbol = params.symbol as string;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<CoinSummary | null>(null);
  const [allCoins, setAllCoins] = useState<CoinSummary[]>([]);
  const [strategyLabel, setStrategyLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chart state
  const [activeTab, setActiveTab] = useState<"equity" | "chart">("chart");

  // Load initial data
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
        const coinSummary = coinsData.coins.find((c) => c.symbol === symbol);
        setSummary(coinSummary || null);
        const strategyLabels: Record<string, string> = {
          rsi_divergence: "RSI Divergence",
          ema_trend: "EMA Trend",
          bb_squeeze: "BB Squeeze",
        };
        setStrategyLabel(strategyLabels[summaryData.run.params?.strategy as string] || "RSI Divergence");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId, symbol]);

  // Handle trade row click (no-op with TradingView widget)
  const handleTradeClick = useCallback((_trade: Trade) => {}, []);

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (error) return <div className="text-center py-12 text-red-500">오류: {error}</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card">
        <Link href={`/backtest/${runId}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← 결과 요약으로 돌아가기
        </Link>
        <h2 className="text-xl font-bold text-card-foreground">
          {symbol} 상세 결과
          {strategyLabel && <span className="ml-2 text-sm font-normal text-muted-foreground">| {strategyLabel}</span>}
        </h2>
      </div>

      {/* Main layout: left sidebar + right content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - stats */}
        <aside className="w-48 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-3 space-y-3">
          {summary && (
            <>
              <StatCard
                label="수익률"
                value={`${summary.cumulative_return >= 0 ? "+" : ""}${summary.cumulative_return}%`}
                color={summary.cumulative_return >= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <StatCard label="승률" value={`${summary.win_rate}%`} />
              <StatCard label="거래수" value={`${summary.total_trades}`} />
              <StatCard
                label="MDD"
                value={`${summary.max_drawdown}%`}
                color="text-amber-400"
              />
              <StatCard label="최종 잔액" value={`$${summary.final_balance.toFixed(2)}`} />
            </>
          )}

          {/* Coin navigation */}
          {allCoins.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">코인 목록</div>
              <div className="space-y-0.5">
                {allCoins.map((c) => (
                  <Link
                    key={c.symbol}
                    href={`/backtest/${runId}/coins/${c.symbol}`}
                    className={`block px-2 py-1.5 rounded text-xs transition-colors ${
                      c.symbol === symbol
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{c.symbol}</span>
                      <span className={
                        c.cumulative_return >= 0 ? "text-emerald-400" : "text-red-400"
                      }>
                        {c.cumulative_return >= 0 ? "+" : ""}{c.cumulative_return}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right content - chart/table split */}
        <main className="flex-1 overflow-hidden">
          <ResizableSplit
            top={
              <div className="h-full flex flex-col">
                {/* Tabs + timeframe selector */}
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
                  <button
                    onClick={() => setActiveTab("equity")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      activeTab === "equity"
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    수익 곡선
                  </button>
                  <button
                    onClick={() => setActiveTab("chart")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      activeTab === "chart"
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    차트
                  </button>

                </div>

                {/* Chart content */}
                <div className="flex-1 overflow-hidden p-2">
                  {activeTab === "equity" ? (
                    trades.length > 0 ? (
                      <EquityCurve trades={trades} initialBalance={100} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        거래 기록이 없습니다.
                      </div>
                    )
                  ) : (
                    <TradingViewChart symbol={symbol} showRsi={false} />
                  )}
                </div>
              </div>
            }
            bottom={
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-card">
                  <span className="text-sm font-medium">
                    포지션 상세 ({trades.length}건)
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
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

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card className="p-0">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className={`text-lg font-bold ${color || ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
