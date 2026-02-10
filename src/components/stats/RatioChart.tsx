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
import type { ShotWithJoins } from "@/components/shots/hooks";

interface RatioChartProps {
  shots: ShotWithJoins[];
}

export function RatioChart({ shots }: RatioChartProps) {
  // Chronological order for trend
  const data = [...shots]
    .reverse()
    .filter((s) => s.brewRatio !== null)
    .map((s) => ({
      date: new Date(s.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ratio: s.brewRatio,
      quality: s.shotQuality,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-stone-400 dark:text-stone-500">
        No shot data to display
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Brew Ratio Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c1917",
              border: "1px solid #44403c",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e7e5e4",
            }}
            formatter={(value) => [`1:${value}`, "Ratio"]}
          />
          <Line
            type="monotone"
            dataKey="ratio"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ fill: "#b45309", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#d97706" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
