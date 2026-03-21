"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoinSummaryTable } from "@/components/coin-summary-table";
import {
  getBacktestSummary,
  getBacktestCoins,
  type BacktestSummary,
  type CoinSummary,
} from "@/lib/api";

export default function BacktestResultPage() {
  const params = useParams();
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

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (error) return <div className="text-center py-12 text-red-500">오류: {error}</div>;
  if (!summary) return null;

  const { aggregate, run } = summary;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">백테스트 결과</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {run.start_date} ~ {run.end_date} | {run.coins.length}개 코인 | Run ID: {run.id}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">총 거래수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregate.total_trades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">평균 승률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregate.avg_win_rate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">평균 수익률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${aggregate.avg_return >= 0 ? "text-green-600" : "text-red-600"}`}>
              {aggregate.avg_return >= 0 ? "+" : ""}{aggregate.avg_return}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">평균 MDD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{aggregate.avg_mdd}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>코인별 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <CoinSummaryTable data={coins} runId={runId} />
        </CardContent>
      </Card>
    </div>
  );
}
