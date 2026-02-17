"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface BeanAgeChartProps {
  shots: ShotWithJoins[];
}

interface AgeDataPoint {
  daysPostRoast: number;
  quality: number;
  bean: string;
  date: string;
}

export function BeanAgeChart({ shots }: BeanAgeChartProps) {
  const data = useMemo(() => {
    const points: AgeDataPoint[] = [];
    for (const shot of shots) {
      if (shot.daysPostRoast !== null && shot.daysPostRoast >= 0) {
        points.push({
          daysPostRoast: shot.daysPostRoast,
          quality: shot.shotQuality,
          bean: shot.beanName ?? "Unknown",
          date: new Date(shot.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    }
    return points;
  }, [shots]);

  // Compute stats for the summary cards
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    // Group by age bucket
    const buckets: Record<string, { total: number; count: number }> = {};
    for (const point of data) {
      const bucket = getBucket(point.daysPostRoast);
      if (!buckets[bucket]) buckets[bucket] = { total: 0, count: 0 };
      buckets[bucket].total += point.quality;
      buckets[bucket].count += 1;
    }

    // Find optimal age range (bucket with highest avg quality)
    let bestBucket = "";
    let bestAvg = 0;
    for (const [bucket, { total, count }] of Object.entries(buckets)) {
      const avg = total / count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestBucket = bucket;
      }
    }

    const avgAge =
      data.reduce((sum, p) => sum + p.daysPostRoast, 0) / data.length;

    return {
      avgAge: Math.round(avgAge),
      bestRange: bestBucket,
      bestAvgQuality: bestAvg.toFixed(1),
      dataPoints: data.length,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
        No roast age data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Bean Roast Age vs Quality
      </h3>

      {/* Summary stats */}
      {stats && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-lg bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
            <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Avg Age
            </span>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              {stats.avgAge} days
            </p>
          </div>
          <div className="rounded-lg bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
            <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Best Range
            </span>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {stats.bestRange} days
            </p>
          </div>
          <div className="rounded-lg bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
            <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Peak Quality
            </span>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              {stats.bestAvgQuality}/5
            </p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis
            dataKey="daysPostRoast"
            type="number"
            name="Days Post Roast"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            label={{
              value: "Days Since Roast",
              position: "insideBottom",
              offset: -5,
              style: { fontSize: 11, fill: "#a8a29e" },
            }}
          />
          <YAxis
            dataKey="quality"
            type="number"
            name="Shot Quality"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            label={{
              value: "Quality",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#a8a29e" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c1917",
              border: "1px solid #44403c",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e7e5e4",
            }}
            formatter={(value, name) => {
              if (name === "Days Post Roast") return [value, "Days Post Roast"];
              return [`${value}/5`, "Quality"];
            }}
            labelFormatter={(_label, payload) => {
              const point = (payload?.[0] as { payload?: AgeDataPoint })?.payload;
              return point ? `${point.bean} (${point.date})` : "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={10} />
          <Scatter
            name="Shots"
            data={data}
            fill="#d97706"
            fillOpacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function getBucket(days: number): string {
  if (days <= 7) return "0–7";
  if (days <= 14) return "8–14";
  if (days <= 21) return "15–21";
  if (days <= 30) return "22–30";
  return "30+";
}
