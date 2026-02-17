"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface DialInChartProps {
  shots: ShotWithJoins[];
}

interface BeanOption {
  id: string;
  name: string;
  shotCount: number;
}

const METRIC_COLORS: Record<string, string> = {
  grindLevel: "#b45309",
  doseGrams: "#0891b2",
  yieldGrams: "#7c3aed",
  brewTimeSecs: "#dc2626",
};

const METRIC_LABELS: Record<string, string> = {
  grindLevel: "Grind Level",
  doseGrams: "Dose (g)",
  yieldGrams: "Yield (g)",
  brewTimeSecs: "Brew Time (s)",
};

export function DialInChart({ shots }: DialInChartProps) {
  const [selectedBeanId, setSelectedBeanId] = useState<string>("");

  // Build bean options from available shots (sorted by shot count desc)
  const beanOptions: BeanOption[] = useMemo(() => {
    const beanMap = new Map<string, { name: string; count: number }>();
    for (const shot of shots) {
      const existing = beanMap.get(shot.beanId);
      if (existing) {
        existing.count++;
      } else {
        beanMap.set(shot.beanId, {
          name: shot.beanName ?? "Unknown",
          count: 1,
        });
      }
    }
    return Array.from(beanMap.entries())
      .map(([id, { name, count }]) => ({ id, name, shotCount: count }))
      .filter((b) => b.shotCount >= 2) // Need at least 2 shots to see progression
      .sort((a, b) => b.shotCount - a.shotCount);
  }, [shots]);

  // Auto-select the first bean with the most shots
  const activeBeanId = selectedBeanId || beanOptions[0]?.id || "";

  // Filter and format data for selected bean
  const data = useMemo(() => {
    if (!activeBeanId) return [];
    return [...shots]
      .filter((s) => s.beanId === activeBeanId)
      .reverse() // Chronological order
      .map((s, i) => ({
        shot: `#${i + 1}`,
        date: new Date(s.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        grindLevel: s.grindLevel ? parseFloat(s.grindLevel) : null,
        doseGrams: s.doseGrams ? parseFloat(s.doseGrams) : null,
        yieldGrams: s.yieldGrams ? parseFloat(s.yieldGrams) : null,
        brewTimeSecs: s.brewTimeSecs ? parseFloat(s.brewTimeSecs) : null,
        quality: s.shotQuality,
      }));
  }, [shots, activeBeanId]);

  if (beanOptions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
        Need at least 2 shots of the same bean for dial-in tracking
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Dial-In Progression
        </h3>
        <select
          value={activeBeanId}
          onChange={(e) => setSelectedBeanId(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          {beanOptions.map((bean) => (
            <option key={bean.id} value={bean.id}>
              {bean.name} ({bean.shotCount} shots)
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis
            dataKey="shot"
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c1917",
              border: "1px solid #44403c",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e7e5e4",
            }}
            labelFormatter={(label, payload) => {
              const date = (payload?.[0] as { payload?: { date?: string } })?.payload?.date ?? "";
              return `${label} (${date})`;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            iconSize={10}
          />
          {Object.entries(METRIC_COLORS).map(([key, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={METRIC_LABELS[key]}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
