"use client";

import { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  type PieLabelRenderProps,
  type PieProps,
} from "recharts";

type ActiveShapeFn = NonNullable<PieProps["activeShape"]>;
import type { ShotWithJoins } from "@/components/shots/hooks";
import { ROAST_LEVELS } from "@/shared/beans/constants";

// ── Types ─────────────────────────────────────────────────────────────

type Metric = "average" | "best" | "typical";

interface RoastSlice {
  level: string;
  shotCount: number;
  /** Pie slice size: max(MIN_SHOTS, shotCount) for minimum visibility */
  pieValue: number;
  /** Selected metric score (0–5) */
  score: number;
  /** Best bean for this roast level on the selected metric */
  topBean: string | null;
  topBeanScore: number;
  /** Raw score rank (1 = best) */
  rank: number;
}

// ── Constants ─────────────────────────────────────────────────────────

const MIN_SHOTS = 2; // minimum pie size so every present level is visible

/** Light → dark coffee palette */
const ROAST_COLORS: Record<string, string> = {
  Light: "#fde68a",
  "Medium-Light": "#fbbf24",
  Medium: "#d97706",
  "Medium-Dark": "#92400e",
  Dark: "#3b1a08",
};

const METRIC_LABELS: Record<Metric, string> = {
  average: "Average",
  best: "Best",
  typical: "Typical",
};

// ── Helpers ───────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function median(values: number[]): number {
  const sorted = [...values].map(toNum).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function applyMetric(ratings: number[], metric: Metric): number {
  const nums = ratings.map(toNum).filter((n) => n > 0);
  if (nums.length === 0) return 0;
  if (metric === "average")
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (metric === "best") return Math.max(...nums);
  return median(nums);
}

function buildSlices(shots: ShotWithJoins[], metric: Metric): RoastSlice[] {
  // Group by roast level
  const groups = new Map<
    string,
    { shotRatings: number[]; beanRatings: Map<string, number[]> }
  >();

  for (const shot of shots) {
    const level = shot.beanRoastLevel;
    if (!level) continue;
    const rating = shot.rating;
    if (rating === null || isNaN(rating)) continue;

    if (!groups.has(level)) {
      groups.set(level, { shotRatings: [], beanRatings: new Map() });
    }
    const g = groups.get(level)!;
    g.shotRatings.push(rating);

    const name = shot.beanName ?? "Unknown";
    const br = g.beanRatings.get(name) ?? [];
    br.push(rating);
    g.beanRatings.set(name, br);
  }

  const slices: Omit<RoastSlice, "rank">[] = ROAST_LEVELS.flatMap((level) => {
    const g = groups.get(level);
    if (!g || g.shotRatings.length === 0) return [];

    const score = applyMetric(g.shotRatings, metric);

    // Top bean for this level
    let topBean: string | null = null;
    let topBeanScore = -Infinity;
    for (const [name, ratings] of g.beanRatings) {
      const s = applyMetric(ratings, metric);
      if (s > topBeanScore) {
        topBeanScore = s;
        topBean = name;
      }
    }

    return [
      {
        level,
        shotCount: g.shotRatings.length,
        pieValue: Math.max(MIN_SHOTS, g.shotRatings.length),
        score: parseFloat(score.toFixed(2)),
        topBean,
        topBeanScore: parseFloat(topBeanScore.toFixed(2)),
      },
    ];
  });

  // Rank by score descending
  const sorted = [...slices].sort((a, b) => b.score - a.score);
  return slices.map((s) => ({
    ...s,
    rank: sorted.findIndex((x) => x.level === s.level) + 1,
  }));
}

// ── Custom active shape ───────────────────────────────────────────────

function ActiveShape(props: PieLabelRenderProps & { fill?: string; isDark?: boolean }) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props as {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
    payload: RoastSlice;
    percent: number;
  };

  const r = Number(outerRadius);

  return (
    <g>
      {/* Expanded outer arc */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={Number(innerRadius)}
        outerRadius={r + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Gold outline for top-ranked slice */}
      {payload.rank === 1 && (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={r + 10}
          outerRadius={r + 14}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="#fbbf24"
        />
      )}
      {/* Center label */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fill="#78716c"
        fontSize={11}
        className="dark:fill-stone-400"
      >
        {payload.level}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fill="#1c1917"
        fontSize={18}
        fontWeight={700}
        className="dark:fill-stone-100"
      >
        {payload.score.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fill="#78716c"
        fontSize={10}
        className="dark:fill-stone-400"
      >
        {Math.round(percent * 100)}% of shots
      </text>
    </g>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: { payload?: RoastSlice }[];
  metric: Metric;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#1c1917",
        border: "1px solid #44403c",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#e7e5e4",
        padding: "10px 14px",
        maxWidth: 200,
      }}
    >
      <p className="mb-1 font-semibold">{d.level}</p>
      <p>
        {METRIC_LABELS[metric]} score:{" "}
        <span className="font-medium text-amber-400">
          {d.score.toFixed(1)}/5
        </span>
      </p>
      <p>{d.shotCount} shots</p>
      {d.topBean && (
        <p className="mt-1 text-stone-400">
          Top bean:{" "}
          <span className="text-stone-200">{d.topBean}</span>
          {" "}({d.topBeanScore.toFixed(1)})
        </p>
      )}
    </div>
  );
}

// ── Rank list ─────────────────────────────────────────────────────────

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function RankList({
  slices,
  activeLevel,
  onHover,
}: {
  slices: RoastSlice[];
  activeLevel: string | null;
  onHover: (level: string | null) => void;
}) {
  const sorted = [...slices].sort((a, b) => b.score - a.score);
  return (
    <div className="mt-4 space-y-1.5">
      {sorted.map((s, i) => (
        <div
          key={s.level}
          onMouseEnter={() => onHover(s.level)}
          onMouseLeave={() => onHover(null)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
            activeLevel === s.level
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
          }`}
        >
          <span className="w-5 text-base">{RANK_MEDALS[i] ?? `#${i + 1}`}</span>
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: ROAST_COLORS[s.level] }}
          />
          <span className="min-w-[100px] text-xs font-medium text-stone-700 dark:text-stone-300">
            {s.level}
          </span>
          <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
            {s.score.toFixed(1)}/5
          </span>
          {s.topBean && (
            <span className="truncate text-xs text-stone-400 dark:text-stone-500">
              {s.topBean}
            </span>
          )}
          <span className="ml-auto text-[10px] text-stone-400">
            {s.shotCount} shots
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Metric toggle ─────────────────────────────────────────────────────

function MetricToggle({
  metric,
  onChange,
}: {
  metric: Metric;
  onChange: (m: Metric) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-700"
      role="group"
      aria-label="Score metric"
    >
      {(["average", "typical", "best"] as Metric[]).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={metric === m}
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            metric === m
              ? "bg-amber-600 text-white"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          }`}
        >
          {METRIC_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

// ── Shared pie renderer ───────────────────────────────────────────────

function RoastPie({
  slices,
  metric,
  activeLevel,
  onPieEnter,
  onPieLeave,
  width = 280,
  height = 280,
}: {
  slices: RoastSlice[];
  metric: Metric;
  activeLevel: string | null;
  onPieEnter: (data: RoastSlice) => void;
  onPieLeave: () => void;
  width?: number;
  height?: number;
}) {
  return (
    <PieChart width={width} height={height}>
      <Pie
        data={slices}
        cx="50%"
        cy="50%"
        innerRadius={70}
        outerRadius={110}
        paddingAngle={4}
        dataKey="pieValue"
        minAngle={8}
        activeShape={ActiveShape as ActiveShapeFn}
        onMouseEnter={(data) => onPieEnter(data as RoastSlice)}
        onMouseLeave={onPieLeave}
      >
        {slices.map((slice) => (
          <Cell
            key={slice.level}
            fill={ROAST_COLORS[slice.level] ?? "#d97706"}
            stroke={
              slice.rank === 1
                ? "#fbbf24"
                : activeLevel === slice.level
                  ? "#d97706"
                  : "transparent"
            }
            strokeWidth={slice.rank === 1 ? 2.5 : 1.5}
            opacity={activeLevel && activeLevel !== slice.level ? 0.6 : 1}
          />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip metric={metric} />} />
    </PieChart>
  );
}

// ── RoastRatingPanel (self-contained card) ────────────────────────────

export function RoastRatingPanel({
  shots,
}: {
  shots: ShotWithJoins[];
}): ReactNode {
  const [metric, setMetric] = useState<Metric>("average");
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [hoverLevel, setHoverLevel] = useState<string | null>(null);

  const slices = useMemo(() => buildSlices(shots, metric), [shots, metric]);

  const effectiveActive = hoverLevel ?? activeLevel;

  const onPieEnter = useCallback((data: RoastSlice) => {
    setActiveLevel(data.level);
    setHoverLevel(null);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveLevel(null);
  }, []);

  const isEmpty = slices.length === 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4 dark:border-stone-700">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Roast Level Preferences
        </h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Which roast do you enjoy most? Slice size = frequency.{" "}
          <span className="text-amber-600 dark:text-amber-400">
            Gold ring = top scorer.
          </span>
        </p>
      </div>

      {/* Metric toggle */}
      <div className="border-b border-stone-200 py-3 dark:border-stone-700">
        <MetricToggle metric={metric} onChange={setMetric} />
      </div>

      {isEmpty ? (
        <div className="flex h-48 items-center justify-center text-sm text-stone-400 dark:text-stone-500">
          No rated shots yet — add ratings to compare roast levels
        </div>
      ) : (
        <>
          {/* Pie chart */}
          <div className="flex justify-center pt-4">
            <RoastPie
              slices={slices}
              metric={metric}
              activeLevel={effectiveActive}
              onPieEnter={onPieEnter}
              onPieLeave={onPieLeave}
            />
          </div>

          {/* Rank list */}
          <RankList
            slices={slices}
            activeLevel={effectiveActive}
            onHover={setHoverLevel}
          />
        </>
      )}
    </div>
  );
}
