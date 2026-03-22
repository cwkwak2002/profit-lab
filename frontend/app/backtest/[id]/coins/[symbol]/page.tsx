"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/equity-curve";
import { TradeTable } from "@/components/trade-table";
import { CandleChart, type CandleChartHandle } from "@/components/candle-chart";
import { ResizableSplit } from "@/components/resizable-split";
import {
  getCoinTrades,
  getBacktestCoins,
  getBacktestSummary,
  getCandles,
  type Trade,
  type CoinSummary,
  type Candle,
  type Timeframe,
} from "@/lib/api";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1D"];

export default function CoinDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const symbol = params.symbol as string;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<CoinSummary | null>(null);
  const [allCoins, setAllCoins] = useState<CoinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chart state
  const [activeTab, setActiveTab] = useState<"equity" | "chart">("chart");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [strategy, setStrategy] = useState("rsi_divergence");

  const chartRef = useRef<CandleChartHandle>(null);

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
        setStartDate(summaryData.run.start_date);
        setEndDate(summaryData.run.end_date);
        if (summaryData.run.params.strategy) {
          setStrategy(summaryData.run.params.strategy as string);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId, symbol]);

  // Load candles when timeframe or dates change
  useEffect(() => {
    if (!startDate || !endDate) return;

    async function loadCandles() {
      setCandlesLoading(true);
      try {
        const data = await getCandles(symbol, timeframe, startDate, endDate, strategy);
        setCandles(data.candles);
      } catch {
        setCandles([]);
      } finally {
        setCandlesLoading(false);
      }
    }
    loadCandles();
  }, [symbol, timeframe, startDate, endDate, strategy]);

  // Handle trade row click → scroll chart
  const handleTradeClick = useCallback(
    (trade: Trade) => {
      if (activeTab !== "chart" || !chartRef.current) return;
      const ts = new Date(trade.entry_time + "Z").getTime() / 1000;
      chartRef.current.scrollToTime(ts);
    },
    [activeTab],
  );

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (error) return <div className="text-center py-12 text-red-500">오류: {error}</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-[#0d1117]">
        <Link href={`/backtest/${runId}`} className="text-sm text-muted-foreground hover:text-[#58a6ff] transition-colors">
          ← 결과 요약으로 돌아가기
        </Link>
        <h2 className="text-xl font-bold text-[#e6edf3]">{symbol} 상세 결과</h2>
      </div>

      {/* Main layout: left sidebar + right content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - stats */}
        <aside className="w-48 flex-shrink-0 border-r border-border bg-[#0d1117] overflow-y-auto p-3 space-y-3">
          {summary && (
            <>
              <StatCard
                label="수익률"
                value={`${summary.cumulative_return >= 0 ? "+" : ""}${summary.cumulative_return}%`}
                color={summary.cumulative_return >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}
              />
              <StatCard label="승률" value={`${summary.win_rate}%`} />
              <StatCard label="거래수" value={`${summary.total_trades}`} />
              <StatCard
                label="MDD"
                value={`${summary.max_drawdown}%`}
                color="text-[#d29922]"
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
                        ? "bg-[#1f6feb] text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{c.symbol}</span>
                      <span className={
                        c.cumulative_return >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
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
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-[#0d1117]">
                  <button
                    onClick={() => setActiveTab("equity")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      activeTab === "equity"
                        ? "bg-[#1f6feb] text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    수익 곡선
                  </button>
                  <button
                    onClick={() => setActiveTab("chart")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      activeTab === "chart"
                        ? "bg-[#1f6feb] text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    차트
                  </button>

                  {activeTab === "chart" && (
                    <div className="flex items-center gap-1 ml-4">
                      {TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            timeframe === tf
                              ? "bg-[#1f6feb] text-white"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  )}
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
                  ) : candlesLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      차트 로딩 중...
                    </div>
                  ) : (
                    <CandleChart
                      ref={chartRef}
                      candles={candles}
                      trades={trades}
                      strategy={strategy}
                    />
                  )}
                </div>
              </div>
            }
            bottom={
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-[#0d1117]">
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
