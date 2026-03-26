"use client";

import { useMemo } from "react";
import { subWeeks, startOfWeek, endOfToday, format } from "date-fns";
import { ActivityCalendar } from "react-activity-calendar";
import type { Activity } from "react-activity-calendar";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface ShotHeatmapProps {
  shots: ShotWithJoins[];
}

const WEEKS_TO_SHOW = 20;

/** Map shot count → activity level 0–4 */
function toLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

const AMBER_THEME = {
  light: ["#f5f5f4", "#fde68a", "#fbbf24", "#d97706", "#92400e"],
  dark: ["#292524", "#451a03", "#92400e", "#b45309", "#d97706"],
};

export function ShotHeatmap({ shots }: ShotHeatmapProps) {
  const { data, totalShots } = useMemo(() => {
    // Build a map of local date → shot count
    const countMap = new Map<string, number>();
    for (const shot of shots) {
      const dateStr = format(new Date(shot.createdAt), "yyyy-MM-dd");
      countMap.set(dateStr, (countMap.get(dateStr) ?? 0) + 1);
    }

    // Range: WEEKS_TO_SHOW weeks back from today
    const end = endOfToday();
    const start = startOfWeek(subWeeks(end, WEEKS_TO_SHOW - 1), {
      weekStartsOn: 0,
    });

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    // Build activity entries for all days with shots + boundary entries
    const entriesMap = new Map<string, Activity>();

    // Ensure start and end are always present (required by the library)
    entriesMap.set(startStr, { date: startStr, count: countMap.get(startStr) ?? 0, level: toLevel(countMap.get(startStr) ?? 0) });
    entriesMap.set(endStr, { date: endStr, count: countMap.get(endStr) ?? 0, level: toLevel(countMap.get(endStr) ?? 0) });

    // Add all shot dates within range
    for (const [dateStr, count] of countMap) {
      if (dateStr >= startStr && dateStr <= endStr) {
        entriesMap.set(dateStr, { date: dateStr, count, level: toLevel(count) });
      }
    }

    const data = Array.from(entriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return { data, totalShots: shots.length };
  }, [shots]);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Shot Activity
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {totalShots} shots in the last {WEEKS_TO_SHOW} weeks
        </span>
      </div>
      <div className="overflow-x-auto">
        <ActivityCalendar
          data={data}
          theme={AMBER_THEME}
          blockSize={12}
          blockMargin={3}
          blockRadius={2}
          fontSize={11}
          showWeekdayLabels={["mon", "wed", "fri"]}
          showTotalCount={false}
          tooltips={{
            activity: {
              text: (a) =>
                a.count === 0
                  ? "No shots"
                  : `${a.count} shot${a.count !== 1 ? "s" : ""} on ${a.date}`,
            },
          }}
          labels={{
            legend: { less: "Less", more: "More" },
          }}
        />
      </div>
    </div>
  );
}
