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

interface ShotQualityChartProps {
  shots: ShotWithJoins[];
}

export function ShotQualityChart({ shots }: ShotQualityChartProps) {
  // Chronological order
  const data = [...shots]
    .reverse()
    .filter((s) => s.shotQuality !== null)
    .map((s) => ({
      date: new Date(s.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      quality: s.shotQuality,
      bean: s.beanName ?? "Unknown",
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
        No shot quality data to display
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Shot Quality Over Time
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
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c1917",
              border: "1px solid #44403c",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e7e5e4",
            }}
            formatter={(value, _name, props) => [
              `${value}/5 — ${(props as { payload: { bean: string } }).payload.bean}`,
              "Quality",
            ]}
          />
          <Line
            type="monotone"
            dataKey="quality"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ fill: "#16a34a", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#22c55e" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
