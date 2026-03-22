"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBenchmarkModels, subscribeBenchmarkStream, type BenchmarkModel } from "@/lib/api";

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-semibold font-mono tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

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
    return <div className="text-center py-20 text-muted-foreground text-sm">불러오는 중...</div>;
  }

  if (models.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <p className="text-muted-foreground">아직 등록된 모델이 없습니다.</p>
        <button className="text-primary hover:underline text-sm" onClick={() => router.push("/benchmark")}>
          주문 입력하기
        </button>
      </div>
    );
  }

  // Aggregate stats
  const totalModels = models.length;
  const avgReturn = models.reduce((s, m) => s + ((m.balance - m.seed) / m.seed) * 100, 0) / totalModels;
  const bestModel = models[0];
  const bestReturn = ((bestModel.balance - bestModel.seed) / bestModel.seed) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI 트레이딩 리더보드</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 모델 트레이딩 성과 비교</p>
        </div>
        <button
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => router.push("/benchmark")}
        >
          + 주문 입력
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-6 rounded-xl border border-border bg-card p-6">
        <MetricCard label="참여 모델" value={`${totalModels}`} />
        <MetricCard label="평균 수익률" value={`${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`} />
        <MetricCard label="최고 수익률" value={`${bestReturn >= 0 ? "+" : ""}${bestReturn.toFixed(1)}%`} sub={bestModel.name} />
        <MetricCard label="총 주문" value={`${models.reduce((s, m) => s + m.total_orders, 0)}`} />
      </div>

      {/* Rankings table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-14 text-xs uppercase tracking-wider text-muted-foreground font-medium">#</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">모델</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">잔액</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">수익률</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">승률</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">MDD</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">Profit Factor</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">체결률</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">주문</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m, idx) => {
              const returnPct = ((m.balance - m.seed) / m.seed) * 100;
              return (
                <TableRow
                  key={m.id}
                  className="cursor-pointer border-border/40 hover:bg-accent/40 transition-colors"
                  onClick={() => router.push(`/benchmark/models/${m.id}`)}
                >
                  <TableCell className="font-mono text-muted-foreground text-sm">
                    {idx < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                        idx === 1 ? "bg-zinc-400/20 text-zinc-300" :
                        "bg-orange-500/20 text-orange-400"
                      }`}>{idx + 1}</span>
                    ) : (
                      <span className="pl-1.5">{idx + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{m.name}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">${m.balance.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-mono text-sm tabular-nums ${returnPct > 0 ? "text-emerald-400" : returnPct < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{m.win_rate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">{m.mdd.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {m.profit_factor !== null ? m.profit_factor.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">{m.fill_rate.toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">{m.total_orders}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
