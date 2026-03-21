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
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#7d8590" }}
          tickFormatter={(val) => val?.slice(5, 16) || ""}
          stroke="#21262d"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#7d8590" }}
          tickFormatter={(val) => `$${val}`}
          stroke="#21262d"
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "잔액"]}
          labelFormatter={(label) => label}
          contentStyle={{ backgroundColor: "#161b22", border: "1px solid #21262d", color: "#c9d1d9" }}
          labelStyle={{ color: "#e6edf3" }}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#58a6ff"
          strokeWidth={2}
          dot={{ r: 3, fill: "#58a6ff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
