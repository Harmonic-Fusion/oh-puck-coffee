"use client";

import { useState } from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface BeanComparisonTableProps {
  shots: ShotWithJoins[];
}

interface BeanRow {
  beanId: string;
  beanName: string;
  shotCount: number;
  avgQuality: number;
  avgRatio: number;
  commonFlavors: string[];
}

export function BeanComparisonTable({ shots }: BeanComparisonTableProps) {
  const [expanded, setExpanded] = useState(false);

  // Group shots by bean
  const beanMap = new Map<string, ShotWithJoins[]>();
  for (const shot of shots) {
    const key = shot.beanId;
    if (!beanMap.has(key)) beanMap.set(key, []);
    beanMap.get(key)!.push(shot);
  }

  const beanRows: BeanRow[] = Array.from(beanMap.entries()).map(
    ([beanId, beanShots]) => {
      const shotCount = beanShots.length;

      const avgQuality = parseFloat(
        (
          beanShots.reduce((acc, s) => acc + s.shotQuality, 0) / shotCount
        ).toFixed(1)
      );

      const ratios = beanShots
        .map((s) => s.brewRatio)
        .filter((r): r is number => r !== null);
      const avgRatio =
        ratios.length > 0
          ? parseFloat(
              (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2)
            )
          : 0;

      // Count flavors
      const flavorCounts: Record<string, number> = {};
      for (const s of beanShots) {
        if (s.flavorProfile && Array.isArray(s.flavorProfile)) {
          for (const f of s.flavorProfile) {
            flavorCounts[f] = (flavorCounts[f] || 0) + 1;
          }
        }
      }
      const commonFlavors = Object.entries(flavorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([f]) => f);

      return {
        beanId,
        beanName: beanShots[0].beanName || "Unknown",
        shotCount,
        avgQuality,
        avgRatio,
        commonFlavors,
      };
    }
  );

  // Sort by avg quality descending
  beanRows.sort((a, b) => b.avgQuality - a.avgQuality);

  if (beanRows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Bean Comparison ({beanRows.length} beans)
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {expanded ? "▲ Collapse" : "▼ Expand"}
        </span>
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-stone-200 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                  Bean
                </th>
                <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                  Shots
                </th>
                <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                  Avg Quality
                </th>
                <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                  Avg Ratio
                </th>
                <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                  Top Flavors
                </th>
              </tr>
            </thead>
            <tbody>
              {beanRows.map((row) => (
                <tr
                  key={row.beanId}
                  className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                >
                  <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-200">
                    {row.beanName}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {row.shotCount}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {row.avgQuality}
                      </span>
                      <span className="text-stone-400 dark:text-stone-500">
                        / 10
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {row.avgRatio ? `1:${row.avgRatio}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.commonFlavors.length > 0
                        ? row.commonFlavors.map((f) => (
                            <span
                              key={f}
                              className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            >
                              {f}
                            </span>
                          ))
                        : "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
