"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/equity-curve";
import { TradeTable } from "@/components/trade-table";
import { getCoinTrades, getBacktestCoins, type Trade, type CoinSummary } from "@/lib/api";

export default function CoinDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const symbol = params.symbol as string;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<CoinSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runId || !symbol) return;

    async function load() {
      try {
        const [tradesData, coinsData] = await Promise.all([
          getCoinTrades(runId, symbol),
          getBacktestCoins(runId),
        ]);
        setTrades(tradesData.trades);
        const coinSummary = coinsData.coins.find((c) => c.symbol === symbol);
        setSummary(coinSummary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId, symbol]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (error) return <div className="text-center py-12 text-red-500">오류: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Link href={`/backtest/${runId}`} className="text-sm text-muted-foreground hover:underline">
          ← 결과 요약으로 돌아가기
        </Link>
        <h2 className="text-2xl font-bold mt-2">{symbol} 상세 결과</h2>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">수익률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${summary.cumulative_return >= 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.cumulative_return >= 0 ? "+" : ""}{summary.cumulative_return}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">승률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{summary.win_rate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">거래수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{summary.total_trades}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">MDD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-orange-600">{summary.max_drawdown}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">최종 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${summary.final_balance.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>수익 곡선 (Equity Curve)</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length > 0 ? (
            <EquityCurve trades={trades} initialBalance={100} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">거래 기록이 없습니다.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>포지션 상세 ({trades.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeTable data={trades} />
        </CardContent>
      </Card>
    </div>
  );
}
