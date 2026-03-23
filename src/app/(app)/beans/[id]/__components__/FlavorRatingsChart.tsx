"use client";

import { useState, useMemo } from "react";
import { useFlavorStats, type FlavorStat } from "@/components/stats/hooks";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Flavor depth cache ────────────────────────────────────────────────

function buildFlavorDepthCache(): Map<string, number> {
  const cache = new Map<string, number>();

  function traverse(node: FlavorNode, depth: number): void {
    cache.set(node.name, depth);
    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  }

  for (const category of FLAVOR_WHEEL_DATA.children) {
    traverse(category, 1);
  }

  return cache;
}

const FLAVOR_DEPTH_CACHE = buildFlavorDepthCache();

type ChartMetric = "ratings" | "count";

export function FlavorRatingsChart({ beanId }: { beanId: string }) {
  const { data, isLoading } = useFlavorStats(beanId);
  const [selectedDepth, setSelectedDepth] = useState<number | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("count");

  const allFlavors = useMemo(() => data?.flavors ?? [], [data?.flavors]);

  const flavors = useMemo(() => {
    if (selectedDepth === null) {
      return allFlavors;
    }
    return allFlavors.filter((f) => {
      const depth = FLAVOR_DEPTH_CACHE.get(f.flavor);
      return depth === selectedDepth;
    });
  }, [allFlavors, selectedDepth]);

  const chartData = useMemo(() => {
    const list = [...flavors];
    if (metric === "ratings") {
      list.sort((a, b) => b.avgRating - a.avgRating);
    } else {
      list.sort((a, b) => b.count - a.count);
    }
    return list;
  }, [flavors, metric]);

  const maxCount = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.count), 1);
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
    );
  }

  if (allFlavors.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
        No flavor data to display
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      {flavors.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-stone-400 dark:text-stone-500">
          No flavors found at selected depth
        </div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(280, chartData.length * 30)}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d6d3d1"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: "#78716c" }}
              tickLine={false}
              domain={
                metric === "ratings" ? [0, 5] : [0, maxCount]
              }
              allowDecimals={metric === "ratings"}
            />
            <YAxis
              dataKey="flavor"
              type="category"
              tick={{ fontSize: 12, fill: "#78716c" }}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1c1917",
                border: "1px solid #44403c",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e7e5e4",
              }}
              formatter={(value, _name, props) => {
                const p = (props as { payload: FlavorStat }).payload;
                if (metric === "ratings") {
                  return [`${value}/5 (${p.count} shots)`, "Avg rating"];
                }
                return [
                  `${value} (${p.avgRating}/5 avg)`,
                  "Times logged",
                ];
              }}
            />
            <Bar
              dataKey={metric === "ratings" ? "avgRating" : "count"}
              fill="#d97706"
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Group by
          </span>
          <div
            className="inline-flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-700"
            role="group"
            aria-label="Chart metric"
          >
            <button
              type="button"
              aria-pressed={metric === "count"}
              onClick={() => setMetric("count")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                metric === "count"
                  ? "bg-amber-600 text-white dark:bg-amber-600"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              Count
            </button>            
            <button
              type="button"
              aria-pressed={metric === "ratings"}
              onClick={() => setMetric("ratings")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                metric === "ratings"
                  ? "bg-amber-600 text-white dark:bg-amber-600"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              Ratings
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="flavor-depth"
            className="text-xs font-medium text-stone-500 dark:text-stone-400"
          >
            Wheel depth
          </label>
          <select
            id="flavor-depth"
            value={selectedDepth === null ? "" : selectedDepth}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDepth(value === "" ? null : parseInt(value, 10));
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:focus:border-amber-500"
          >
            <option value="">All depths</option>
            <option value="1">Depth 1</option>
            <option value="2">Depth 2</option>
            <option value="3">Depth 3</option>
          </select>
        </div>
      </div>
    </div>
  );
}
