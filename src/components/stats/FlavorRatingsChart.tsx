"use client";

import { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";
import type { FlavorStat } from "@/components/stats/hooks";
import {
  aggregateFlavorStatsFromShots,
  FLAVOR_DEPTH_CACHE,
} from "@/lib/flavor-stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/common/ChartContainer";

type ChartMetric = "ratings" | "count";

// ── Toggle group ─────────────────────────────────────────────────────

interface ToggleGroupOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface ToggleGroupProps<T extends string | number> {
  label: string;
  ariaLabel: string;
  options: ToggleGroupOption<T>[];
  isActive: (value: T) => boolean;
  onToggle: (value: T) => void;
}

function ToggleGroup<T extends string | number>({
  label,
  ariaLabel,
  options,
  isActive,
  onToggle,
}: ToggleGroupProps<T>): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <div
        className="inline-flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-700"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((opt) => {
          const active = isActive(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-amber-600 text-white dark:bg-amber-600"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DEPTH_OPTIONS: ToggleGroupOption<number>[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

const TASTING_NOTES_DESCRIPTION =
  "Flavor tags from the filtered shots, grouped by wheel depth. Use Count for frequency or Ratings for average score per note.";

function MetricSelector({
  metric,
  setMetric,
}: {
  metric: ChartMetric;
  setMetric: (metric: ChartMetric) => void;
}) {
  return (
    <select
      value={metric}
      onChange={(e) => setMetric(e.target.value as ChartMetric)}
      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
      aria-label="Metric for horizontal axis"
    >
      <option value="count">Count</option>
      <option value="ratings">Ratings</option>
    </select>
  );
}

// ── FlavorRatingsChart ───────────────────────────────────────────────

export function FlavorRatingsChart({
  shots,
  isLoading = false,
}: {
  shots: ShotWithJoins[];
  isLoading?: boolean;
}): ReactNode {
  const [selectedDepths, setSelectedDepths] = useState<Set<number>>(
    () => new Set([1, 2, 3]),
  );
  const [metric, setMetric] = useState<ChartMetric>("count");

  const allFlavors = useMemo(
    () => aggregateFlavorStatsFromShots(shots),
    [shots],
  );

  const flavors = useMemo(() => {
    if (selectedDepths.size === 3) {
      return allFlavors;
    }
    return allFlavors.filter((f) => {
      const depth = FLAVOR_DEPTH_CACHE.get(f.flavor);
      return depth !== undefined && selectedDepths.has(depth);
    });
  }, [allFlavors, selectedDepths]);

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

  const handleDepthToggle = useCallback((depth: number) => {
    setSelectedDepths((prev) => {
      const next = new Set(prev);
      if (next.has(depth) && next.size > 1) {
        next.delete(depth);
      } else {
        next.add(depth);
      }
      return next;
    });
  }, []);

  if (!isLoading && allFlavors.length === 0) {
    return (
      <ChartContainer
        title="Tasting Notes"
        description={TASTING_NOTES_DESCRIPTION}
        chartHeight={256}
        showNoData
        noDataOverlay="No flavor data to display"
      />
    );
  }

  const chartAreaHeight = Math.max(280, chartData.length * 30);

  return (
    <ChartContainer
      title="Tasting Notes"
      description={TASTING_NOTES_DESCRIPTION}
      isLoading={isLoading}
      chartHeight={chartAreaHeight}
      showNoData={flavors.length === 0}
      noDataOverlay="No flavors found at selected depth"
      xController={
        <MetricSelector metric={metric} setMetric={setMetric} />
      }
      controllers={
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            label="Wheel depth"
            ariaLabel="Wheel depth filter"
            options={DEPTH_OPTIONS}
            isActive={(v) => selectedDepths.has(v)}
            onToggle={handleDepthToggle}
          />
        </div>
      }
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
    </ChartContainer>
  );
}
