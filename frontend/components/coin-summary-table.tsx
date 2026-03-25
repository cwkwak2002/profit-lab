"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { CoinSummary } from "@/lib/api";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const PX = {
  alt:    "#1a1a4e",
  border: "#3355ff",
  cyan:   "#00eeff",
  green:  "#00ff7f",
  red:    "#ff3333",
  yellow: "#ffe000",
  white:  "#f0f0ff",
  mid:    "#8888aa",
  dim:    "#555577",
  fp:     "'Press Start 2P', monospace",
  fm:     "'JetBrains Mono', monospace",
  fb:     "Pretendard, sans-serif",
} as const;

const columns: ColumnDef<CoinSummary>[] = [
  { accessorKey: "symbol",           header: "코인" },
  { accessorKey: "total_trades",     header: "거래수" },
  { accessorKey: "win_rate",         header: "승률" },
  { accessorKey: "cumulative_return",header: "수익률" },
  { accessorKey: "max_drawdown",     header: "MDD" },
  { accessorKey: "final_balance",    header: "최종 잔액" },
];

interface Props { data: CoinSummary[]; runId: string; }

export function CoinSummaryTable({ data, runId }: Props) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data, columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const thStyle: React.CSSProperties = {
    fontFamily: PX.fp, fontSize: 8, color: PX.mid,
    letterSpacing: "0.06em", padding: "10px 14px",
    textAlign: "left", fontWeight: "normal",
    borderBottom: `2px solid ${PX.border}`,
    background: PX.alt, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontFamily: PX.fm, fontSize: 13,
    borderBottom: "1px solid rgba(51,85,255,0.15)",
    color: PX.white,
  };

  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
        데이터 없음
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <th
                  key={header.id}
                  style={thStyle}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.column.columnDef.header as string}
                  {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => {
          const coin = row.original;
          const ret  = coin.cumulative_return;
          return (
            <tr
              key={row.id}
              onClick={() => router.push(`/backtest/${runId}/coins/${coin.symbol}`)}
              style={{ cursor: "pointer", transition: "background 0.1s steps(1)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,85,255,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* 코인 */}
              <td style={{ ...tdStyle, fontFamily: PX.fp, fontSize: 9, color: PX.cyan }}>
                {coin.symbol}
              </td>
              {/* 거래수 */}
              <td style={{ ...tdStyle, color: PX.mid }}>
                {coin.total_trades}
              </td>
              {/* 승률 */}
              <td style={{ ...tdStyle, color: coin.win_rate >= 50 ? PX.green : PX.red, fontWeight: 700 }}>
                {coin.win_rate}%
              </td>
              {/* 수익률 */}
              <td style={{ ...tdStyle, color: ret >= 0 ? PX.green : PX.red, fontWeight: 700 }}>
                {ret >= 0 ? "+" : ""}{ret}%
              </td>
              {/* MDD */}
              <td style={{ ...tdStyle, color: PX.yellow }}>
                {coin.max_drawdown}%
              </td>
              {/* 최종 잔액 */}
              <td style={{ ...tdStyle, color: PX.white }}>
                ${coin.final_balance.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
