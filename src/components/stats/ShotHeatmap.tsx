"use client";

import { useMemo } from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface ShotHeatmapProps {
  shots: ShotWithJoins[];
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;
const WEEKS_TO_SHOW = 20;

function getColorClass(count: number): string {
  if (count === 0) return "bg-stone-100 dark:bg-stone-800";
  if (count === 1) return "bg-amber-200 dark:bg-amber-900/40";
  if (count === 2) return "bg-amber-300 dark:bg-amber-800/60";
  if (count === 3) return "bg-amber-400 dark:bg-amber-700/70";
  return "bg-amber-500 dark:bg-amber-600";
}

export function ShotHeatmap({ shots }: ShotHeatmapProps) {
  const { grid, monthLabels, totalShots } = useMemo(() => {
    // Build a map of date → shot count
    const countMap = new Map<string, number>();
    for (const shot of shots) {
      const dateStr = new Date(shot.createdAt).toISOString().slice(0, 10);
      countMap.set(dateStr, (countMap.get(dateStr) ?? 0) + 1);
    }

    // Build grid: WEEKS_TO_SHOW weeks ending at current week
    const today = new Date();
    // Find the start of the grid (Sunday of the first week)
    const endDay = new Date(today);
    const dayOfWeek = endDay.getDay(); // 0 = Sun
    // Go back WEEKS_TO_SHOW weeks from the start of this week
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - dayOfWeek - (WEEKS_TO_SHOW - 1) * 7);

    const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
    const months: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDay);
    let weekIdx = 0;
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

    while (cursor <= endDay) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const month = cursor.getMonth();

      if (month !== lastMonth) {
        months.push({
          label: cursor.toLocaleDateString("en-US", { month: "short" }),
          colIndex: weekIdx,
        });
        lastMonth = month;
      }

      currentWeek.push({
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        dayOfWeek: cursor.getDay(),
      });

      if (cursor.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIdx++;
      }

      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      grid: weeks,
      monthLabels: months,
      totalShots: shots.length,
    };
  }, [shots]);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Shot Activity
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {totalShots} shots in the last {WEEKS_TO_SHOW} weeks
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5">
          {/* Month labels */}
          <div className="flex gap-0.5 pl-8">
            {monthLabels.map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                className="text-[10px] text-stone-400 dark:text-stone-500"
                style={{
                  position: "relative",
                  left: `${m.colIndex * 14}px`,
                  marginRight: i < monthLabels.length - 1
                    ? `${((monthLabels[i + 1]?.colIndex ?? 0) - m.colIndex - 1) * 14}px`
                    : undefined,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-1">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-0.5">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[12px] w-6 items-center justify-end pr-1 text-[10px] text-stone-400 dark:text-stone-500"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week.find((c) => c.dayOfWeek === di);
                  if (!cell) {
                    return (
                      <div key={di} className="h-[12px] w-[12px]" />
                    );
                  }
                  return (
                    <div
                      key={di}
                      className={`h-[12px] w-[12px] rounded-[2px] ${getColorClass(cell.count)}`}
                      title={`${cell.date}: ${cell.count} shot${cell.count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-1 pl-8">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              Less
            </span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-[10px] w-[10px] rounded-[2px] ${getColorClass(level)}`}
              />
            ))}
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
