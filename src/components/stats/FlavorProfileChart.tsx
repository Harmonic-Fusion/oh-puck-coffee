"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface FlavorProfileChartProps {
  shots: ShotWithJoins[];
}

export function FlavorProfileChart({ shots }: FlavorProfileChartProps) {
  // Count flavor frequency from flavor wheel categories
  const flavorCounts: Record<string, number> = {};
  for (const shot of shots) {
    if (shot.flavorWheelCategories && typeof shot.flavorWheelCategories === "object") {
      for (const flavors of Object.values(shot.flavorWheelCategories)) {
        for (const flavor of flavors) {
          flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
        }
      }
    }
  }

  const data = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-stone-400 dark:text-stone-500">
        No flavor data to display
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Top Flavors
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c1917",
              border: "1px solid #44403c",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e7e5e4",
            }}
            formatter={(value) => [value, "Shots"]}
          />
          <Bar
            dataKey="count"
            fill="#b45309"
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
