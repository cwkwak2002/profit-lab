"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Trade } from "@/lib/api";

interface Props {
  trades: Trade[];
  initialBalance: number;
}

export function EquityCurve({ trades, initialBalance }: Props) {
  const data = [
    { time: trades.length > 0 ? trades[0].entry_time : "", balance: initialBalance },
    ...trades.map((t) => ({
      time: t.exit_time,
      balance: t.balance_after,
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => val?.slice(5, 16) || ""}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "잔액"]}
          labelFormatter={(label) => label}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
