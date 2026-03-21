"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/api";

const reasonColors: Record<string, string> = {
  SL: "destructive",
  TP1: "default",
  TP2: "default",
  BE: "secondary",
  TIMEOUT: "outline",
  NO_DATA: "outline",
};

const reasonLabels: Record<string, string> = {
  SL: "손절",
  TP2: "2차 익절",
  BE: "본절",
  TIMEOUT: "타임아웃",
  NO_DATA: "데이터 없음",
};

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: "entry_time",
    header: "진입시점",
    cell: ({ row }) => row.original.entry_time,
  },
  {
    accessorKey: "entry_price",
    header: "진입가",
    cell: ({ row }) => `$${row.original.entry_price}`,
  },
  {
    accessorKey: "entry_margin",
    header: "마진 ($)",
    cell: ({ row }) => `$${row.original.entry_margin.toFixed(2)}`,
  },
  {
    accessorKey: "exit_time",
    header: "청산시점",
    cell: ({ row }) => row.original.exit_time,
  },
  {
    accessorKey: "exit_price",
    header: "청산가",
    cell: ({ row }) => `$${row.original.exit_price}`,
  },
  {
    accessorKey: "exit_reason",
    header: "종료사유",
    cell: ({ row }) => {
      const reason = row.original.exit_reason;
      return (
        <Badge variant={reasonColors[reason] as "default" | "destructive" | "secondary" | "outline"}>
          {reasonLabels[reason] || reason}
        </Badge>
      );
    },
  },
  {
    accessorKey: "pnl",
    header: "P&L ($)",
    cell: ({ row }) => {
      const val = row.original.pnl;
      return (
        <span className={val >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {val >= 0 ? "+" : ""}{val.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "pnl_pct",
    header: "P&L (%)",
    cell: ({ row }) => {
      const val = row.original.pnl_pct;
      return (
        <span className={val >= 0 ? "text-green-600" : "text-red-600"}>
          {val >= 0 ? "+" : ""}{val}%
        </span>
      );
    },
  },
  {
    accessorKey: "balance_after",
    header: "잔액 ($)",
    cell: ({ row }) => `$${row.original.balance_after.toFixed(2)}`,
  },
];

interface Props {
  data: Trade[];
}

export function TradeTable({ data }: Props) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap text-xs">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="whitespace-nowrap text-xs">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                거래 기록이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
