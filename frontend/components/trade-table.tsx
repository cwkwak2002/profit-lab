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
import type { Trade } from "@/lib/api";

const reasonStyleMap: Record<string, string> = {
  SL: "bg-[#f85149]/15 text-[#f85149] border-transparent",
  TP2: "bg-[#3fb950]/15 text-[#3fb950] border-transparent",
  FIXED_TP: "bg-[#3fb950]/15 text-[#3fb950] border-transparent",
  BE: "bg-[#d29922]/15 text-[#d29922] border-transparent",
  EMA_CROSS: "bg-[#a371f7]/15 text-[#a371f7] border-transparent",
  TRAIL: "bg-[#3fb950]/15 text-[#3fb950] border-transparent",
  TIMEOUT: "bg-transparent text-muted-foreground border-border",
  NO_DATA: "bg-transparent text-muted-foreground border-border",
};

const reasonLabels: Record<string, string> = {
  SL: "SL",
  TP2: "TP1+TP2",
  FIXED_TP: "TP +3.5%",
  BE: "TP1+BE",
  EMA_CROSS: "TP1+EMA Cross",
  TRAIL: "TRAIL",
  TIMEOUT: "TIMEOUT",
  NO_DATA: "NO_DATA",
};

const riskReasonLabels: Record<string, string> = {
  RISK_EMA_GAP: "EMA 간격 < 0.5%",
  RISK_TRAPPED: "15m EMA 구간 갇힘",
  RISK_ADX: "ADX < 20",
  RISK_BB_EXPANSION: "BB 확장 필터",
  RISK_SPIKE: "급등/급락 쿨다운",
  RISK_BTC_CRASH: "BTC 급락",
  RISK_RSI_INUNDATION: "RSI 침수 (10봉+)",
  RISK_DEAD_ZONE: "데드 존 (200 EMA 이격)",
};

function isRiskBlocked(reason: string): boolean {
  return reason.startsWith("RISK_");
}

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: "entry_time",
    header: "진입시점",
    cell: ({ row }) => row.original.entry_time,
  },
  {
    accessorKey: "entry_price",
    header: "진입가",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      return `$${row.original.entry_price}`;
    },
  },
  {
    accessorKey: "entry_margin",
    header: "마진 ($)",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      return `$${row.original.entry_margin.toFixed(2)}`;
    },
  },
  {
    accessorKey: "exit_time",
    header: "청산시점",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      return row.original.exit_time;
    },
  },
  {
    accessorKey: "exit_price",
    header: "청산가",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      return `$${row.original.exit_price}`;
    },
  },
  {
    accessorKey: "exit_reason",
    header: "종료사유",
    cell: ({ row }) => {
      const reason = row.original.exit_reason;
      if (isRiskBlocked(reason)) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#6e7681]/15 text-[#6e7681] border-transparent">
            {riskReasonLabels[reason] || reason}
          </span>
        );
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${reasonStyleMap[reason] || "text-muted-foreground"}`}>
          {reasonLabels[reason] || reason}
        </span>
      );
    },
  },
  {
    accessorKey: "pnl",
    header: "P&L ($)",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      const val = row.original.pnl;
      return (
        <span className={val >= 0 ? "text-[#3fb950] font-medium" : "text-[#f85149] font-medium"}>
          {val >= 0 ? "+" : ""}{val.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "pnl_pct",
    header: "P&L (%)",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      const val = row.original.pnl_pct;
      return (
        <span className={val >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}>
          {val >= 0 ? "+" : ""}{val}%
        </span>
      );
    },
  },
  {
    accessorKey: "balance_after",
    header: "잔액 ($)",
    cell: ({ row }) => {
      if (isRiskBlocked(row.original.exit_reason)) return "—";
      return `$${row.original.balance_after.toFixed(2)}`;
    },
  },
];

interface Props {
  data: Trade[];
  onRowClick?: (trade: Trade) => void;
  highlightClickable?: boolean;
}

export function TradeTable({ data, onRowClick, highlightClickable }: Props) {
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
          {table.getRowModel().rows.map((row) => {
            const blocked = isRiskBlocked(row.original.exit_reason);
            return (
              <TableRow
                key={row.id}
                onClick={() => !blocked && onRowClick?.(row.original)}
                className={
                  blocked
                    ? "opacity-50 bg-[#6e7681]/5"
                    : highlightClickable
                      ? "cursor-pointer hover:bg-muted/50"
                      : ""
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
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
