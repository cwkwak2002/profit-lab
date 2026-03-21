"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CoinSummary } from "@/lib/api";

const columns: ColumnDef<CoinSummary>[] = [
  { accessorKey: "symbol", header: "코인" },
  { accessorKey: "total_trades", header: "거래수" },
  {
    accessorKey: "win_rate",
    header: "승률 (%)",
    cell: ({ row }) => `${row.original.win_rate}%`,
  },
  {
    accessorKey: "cumulative_return",
    header: "수익률 (%)",
    cell: ({ row }) => {
      const val = row.original.cumulative_return;
      return (
        <span className={val >= 0 ? "text-green-600" : "text-red-600"}>
          {val >= 0 ? "+" : ""}{val}%
        </span>
      );
    },
  },
  {
    accessorKey: "max_drawdown",
    header: "MDD (%)",
    cell: ({ row }) => `${row.original.max_drawdown}%`,
  },
  {
    accessorKey: "final_balance",
    header: "최종 잔액 ($)",
    cell: ({ row }) => `$${row.original.final_balance.toFixed(2)}`,
  },
];

interface Props {
  data: CoinSummary[];
  runId: string;
}

export function CoinSummaryTable({ data, runId }: Props) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => router.push(`/backtest/${runId}/coins/${row.original.symbol}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                데이터가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
