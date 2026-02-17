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

interface TopFlavorsChartProps {
  shots: ShotWithJoins[];
}

interface FlavorStat {
  flavor: string;
  avgRating: number;
  count: number;
}

export function TopFlavorsChart({ shots }: TopFlavorsChartProps) {
  // Aggregate flavors with their average rating
  const flavorRatings: Record<string, { totalRating: number; count: number }> =
    {};

  for (const shot of shots) {
    if (
      shot.flavorWheelCategories &&
      typeof shot.flavorWheelCategories === "object"
    ) {
      const rating = shot.rating ?? shot.shotQuality;
      for (const flavors of Object.values(shot.flavorWheelCategories)) {
        for (const flavor of flavors) {
          if (!flavorRatings[flavor]) {
            flavorRatings[flavor] = { totalRating: 0, count: 0 };
          }
          flavorRatings[flavor].totalRating += rating;
          flavorRatings[flavor].count += 1;
        }
      }
    }
  }

  const data: FlavorStat[] = Object.entries(flavorRatings)
    .map(([flavor, { totalRating, count }]) => ({
      flavor,
      avgRating: parseFloat((totalRating / count).toFixed(1)),
      count,
    }))
    .filter((d) => d.count >= 1)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
        No flavor data to display
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Top Flavors by Avg Rating
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d6d3d1"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            domain={[0, 5]}
          />
          <YAxis
            dataKey="flavor"
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
            formatter={(value, _name, props) => [
              `${value}/5 (${(props as { payload: FlavorStat }).payload.count} shots)`,
              "Avg Rating",
            ]}
          />
          <Bar
            dataKey="avgRating"
            fill="#d97706"
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
