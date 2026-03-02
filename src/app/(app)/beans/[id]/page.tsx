"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBean, useBeanShots, useUpdateBean, useBeans } from "@/components/beans/hooks";
import { BeanFormModal } from "@/components/beans/BeanSelector";
import { useFlavorStats } from "@/components/stats/hooks";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { AppRoutes } from "@/app/routes";
import { cn } from "@/lib/utils";
import { ROAST_LEVELS } from "@/shared/beans/constants";
import {
  ChevronRightIcon,
  PencilSquareIcon,
  ShareIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Shot types ──────────────────────────────────────────────────────

type ShotSlotType = "best-rating" | "reference" | "shot-number" | "typical" | "average";

interface SlotConfig {
  id: string;
  type: ShotSlotType;
  shotNumber: number;
  dateFrom: string;
  dateTo: string;
}

interface ShotRow {
  id: string;
  doseGrams: string | null;
  yieldGrams: string | null;
  grindLevel: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  flowRate: string | null;
  shotQuality: string | null;
  rating: string | null;
  bitter: string | null;
  sour: string | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  isReferenceShot: boolean;
  isHidden: boolean;
  createdAt: string;
  brewRatio: number | null;
  daysPostRoast: number | null;
}

type ComparisonFieldKey =
  | "dose" | "yield" | "ratio" | "brewTime" | "grindLevel"
  | "brewTemp" | "preInfusion" | "pressure" | "flowRate"
  | "quality" | "rating" | "bitter" | "sour" | "notes"
  | "flavors" | "bodyTexture" | "adjectives"
  | "date" | "daysPostRoast";

const COMPARISON_ROWS: {
  key: ComparisonFieldKey;
  label: string;
  unit?: string;
  isText?: boolean;
  higherIsBetter?: boolean;
}[] = [
  { key: "dose", label: "Dose", unit: "g" },
  { key: "yield", label: "Yield", unit: "g" },
  { key: "ratio", label: "Ratio" },
  { key: "brewTime", label: "Brew Time", unit: "s" },
  { key: "grindLevel", label: "Grind Level" },
  { key: "brewTemp", label: "Brew Temp", unit: "°C" },
  { key: "preInfusion", label: "Pre-infusion", unit: "s" },
  { key: "pressure", label: "Pressure", unit: "bar" },
  { key: "flowRate", label: "Flow Rate", unit: "g/s" },
  { key: "quality", label: "Quality", higherIsBetter: true },
  { key: "rating", label: "Rating", higherIsBetter: true },
  { key: "bitter", label: "Bitter" },
  { key: "sour", label: "Sour" },
  { key: "flavors", label: "Flavors", isText: true },
  { key: "bodyTexture", label: "Body Texture", isText: true },
  { key: "adjectives", label: "Adjectives", isText: true },
  { key: "notes", label: "Notes", isText: true },
  { key: "date", label: "Date", isText: true },
  { key: "daysPostRoast", label: "Days Post Roast", unit: "d" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtNum(v: string | number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toFixed(decimals);
}

function avgNum(arr: ShotRow[], getter: (s: ShotRow) => number | null): number | null {
  const vals = arr.map(getter).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

function getFieldValue(
  key: ComparisonFieldKey,
  shot: ShotRow | null,
  averaged?: Record<string, number | null>,
): string {
  if (averaged) {
    switch (key) {
      case "dose": return fmtNum(averaged.dose);
      case "yield": return fmtNum(averaged.yield);
      case "ratio": return fmtNum(averaged.ratio, 2);
      case "brewTime": return fmtNum(averaged.brewTime);
      case "grindLevel": return fmtNum(averaged.grindLevel, 2);
      case "brewTemp": return fmtNum(averaged.brewTemp);
      case "preInfusion": return fmtNum(averaged.preInfusion);
      case "pressure": return fmtNum(averaged.pressure, 2);
      case "flowRate": return fmtNum(averaged.flowRate, 2);
      case "quality": return fmtNum(averaged.quality);
      case "rating": return fmtNum(averaged.rating);
      case "bitter": return fmtNum(averaged.bitter);
      case "sour": return fmtNum(averaged.sour);
      case "daysPostRoast": return fmtNum(averaged.daysPostRoast, 0);
      case "flavors":
      case "bodyTexture":
      case "adjectives":
      case "notes":
      case "date":
        return "—"; // These fields can't be averaged
      default: return "—";
    }
  }
  if (!shot) return "—";
  switch (key) {
    case "dose": return fmtNum(shot.doseGrams);
    case "yield": return fmtNum(shot.yieldGrams);
    case "ratio": return shot.brewRatio != null ? shot.brewRatio.toFixed(2) : "—";
    case "brewTime": return fmtNum(shot.brewTimeSecs);
    case "grindLevel": return fmtNum(shot.grindLevel, 2);
    case "brewTemp": return fmtNum(shot.brewTempC);
    case "preInfusion": return fmtNum(shot.preInfusionDuration);
    case "pressure": return fmtNum(shot.brewPressure, 2);
    case "flowRate": return fmtNum(shot.flowRate, 2);
    case "quality": return fmtNum(shot.shotQuality);
    case "rating": return fmtNum(shot.rating);
    case "bitter": return fmtNum(shot.bitter);
    case "sour": return fmtNum(shot.sour);
    case "flavors": return shot.flavors && shot.flavors.length > 0 ? shot.flavors.join(", ") : "—";
    case "bodyTexture": return shot.bodyTexture && shot.bodyTexture.length > 0 ? shot.bodyTexture.join(", ") : "—";
    case "adjectives": return shot.adjectives && shot.adjectives.length > 0 ? shot.adjectives.join(", ") : "—";
    case "notes": return shot.notes ?? "—";
    case "date": return fmtDate(shot.createdAt);
    case "daysPostRoast": return shot.daysPostRoast != null ? String(shot.daysPostRoast) : "—";
  }
}

interface ResolvedColumn {
  label: string;
  sublabel?: string;
  isAverage?: boolean;
  shot?: ShotRow;
  averaged?: Record<string, number | null>;
  isEmpty?: boolean;
}

function resolveSlot(slot: SlotConfig, shots: ShotRow[]): ResolvedColumn {
  const nonHidden = [...shots]
    .filter((s) => !s.isHidden)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const filterByRange = (arr: ShotRow[]): ShotRow[] => {
    let f = arr;
    if (slot.dateFrom) f = f.filter((s) => new Date(s.createdAt) >= new Date(slot.dateFrom));
    if (slot.dateTo) {
      const end = new Date(slot.dateTo);
      end.setHours(23, 59, 59, 999);
      f = f.filter((s) => new Date(s.createdAt) <= end);
    }
    return f;
  };

  switch (slot.type) {
    case "best-rating": {
      const sorted = [...shots].sort((a, b) => {
        const ra = a.rating ? parseFloat(a.rating) : 0;
        const rb = b.rating ? parseFloat(b.rating) : 0;
        if (ra !== rb) return rb - ra;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      const shot = sorted[0];
      return shot
        ? {
            label: "Best Rating",
            sublabel: shot.rating ? `★ ${parseFloat(shot.rating).toFixed(1)}` : undefined,
            shot,
          }
        : { label: "Best Rating", isEmpty: true };
    }

    case "reference": {
      const refs = shots
        .filter((s) => s.isReferenceShot)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const shot = refs[0];
      return shot ? { label: "Reference", shot } : { label: "Reference", isEmpty: true };
    }

    case "shot-number": {
      const n = Math.max(1, slot.shotNumber || 1);
      const shot = nonHidden[n - 1];
      return shot
        ? { label: `Shot #${n}`, sublabel: fmtDate(shot.createdAt), shot }
        : { label: `Shot #${n}`, isEmpty: true };
    }

    case "typical": {
      const filtered = filterByRange([...shots]).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const mid = Math.floor(filtered.length / 2);
      const shot = filtered[mid];
      const sub =
        slot.dateFrom && slot.dateTo
          ? `${fmtDate(slot.dateFrom)} – ${fmtDate(slot.dateTo)}`
          : undefined;
      return shot ? { label: "Typical", sublabel: sub, shot } : { label: "Typical", isEmpty: true };
    }

    case "average": {
      const filtered = filterByRange(shots);
      if (!filtered.length) return { label: "Average", isEmpty: true };
      const sub =
        slot.dateFrom && slot.dateTo
          ? `${fmtDate(slot.dateFrom)} – ${fmtDate(slot.dateTo)}`
          : `${filtered.length} shots`;
      const n = (getter: (s: ShotRow) => number | null) => avgNum(filtered, getter);
      return {
        label: "Average",
        sublabel: sub,
        isAverage: true,
        averaged: {
          dose: n((s) => (s.doseGrams ? parseFloat(s.doseGrams) : null)),
          yield: n((s) => (s.yieldGrams ? parseFloat(s.yieldGrams) : null)),
          ratio: n((s) => s.brewRatio),
          brewTime: n((s) => (s.brewTimeSecs ? parseFloat(s.brewTimeSecs) : null)),
          grindLevel: n((s) => (s.grindLevel ? parseFloat(s.grindLevel) : null)),
          brewTemp: n((s) => (s.brewTempC ? parseFloat(s.brewTempC) : null)),
          preInfusion: n((s) => (s.preInfusionDuration ? parseFloat(s.preInfusionDuration) : null)),
          pressure: n((s) => (s.brewPressure ? parseFloat(s.brewPressure) : null)),
          flowRate: n((s) => (s.flowRate ? parseFloat(s.flowRate) : null)),
          quality: n((s) => (s.shotQuality ? parseFloat(s.shotQuality) : null)),
          rating: n((s) => (s.rating ? parseFloat(s.rating) : null)),
          bitter: n((s) => (s.bitter ? parseFloat(s.bitter) : null)),
          sour: n((s) => (s.sour ? parseFloat(s.sour) : null)),
          daysPostRoast: n((s) => s.daysPostRoast),
        },
      };
    }
  }
}

// ── Sub-components ──────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">{value}</p>
    </div>
  );
}

const SLOT_TYPE_OPTIONS: { value: ShotSlotType; label: string }[] = [
  { value: "best-rating", label: "Best Rating" },
  { value: "reference", label: "Reference Shot" },
  { value: "shot-number", label: "Shot #" },
  { value: "typical", label: "Typical (date range)" },
  { value: "average", label: "Average (date range)" },
];

function SlotSelector({
  slot,
  onChange,
  onRemove,
  totalNonHidden,
}: {
  slot: SlotConfig;
  onChange: (updated: SlotConfig) => void;
  onRemove: () => void;
  totalNonHidden: number;
}) {
  const upd = (partial: Partial<SlotConfig>) => onChange({ ...slot, ...partial });
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1.5">
        <select
          value={slot.type}
          onChange={(e) => upd({ type: e.target.value as ShotSlotType })}
          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          {SLOT_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {slot.type === "shot-number" && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-stone-500">Shot #</label>
            <input
              type="number"
              min={1}
              max={totalNonHidden || 1}
              value={slot.shotNumber}
              onChange={(e) => upd({ shotNumber: parseInt(e.target.value) || 1 })}
              className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            />
            <span className="text-xs text-stone-400">of {totalNonHidden}</span>
          </div>
        )}

        {(slot.type === "typical" || slot.type === "average") && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={slot.dateFrom}
              onChange={(e) => upd({ dateFrom: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            />
            <span className="shrink-0 text-xs text-stone-400">–</span>
            <input
              type="date"
              value={slot.dateTo}
              onChange={(e) => upd({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1.5 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ComparisonMatrix({
  shots,
  slots,
  onSlotsChange,
}: {
  shots: ShotRow[];
  slots: SlotConfig[];
  onSlotsChange: (slots: SlotConfig[]) => void;
}) {
  const nonHiddenCount = shots.filter((s) => !s.isHidden).length;

  const columns = useMemo(
    () => slots.map((slot) => resolveSlot(slot, shots)),
    [slots, shots],
  );

  const addSlot = () => {
    if (slots.length >= 3) return;
    onSlotsChange([
      ...slots,
      {
        id: String(Date.now()),
        type: "shot-number",
        shotNumber: slots.length + 1,
        dateFrom: "",
        dateTo: "",
      },
    ]);
  };

  // For numeric rows, find the best value to highlight
  const bestValues = useMemo(() => {
    const map: Partial<Record<ComparisonFieldKey, number>> = {};
    for (const row of COMPARISON_ROWS) {
      if (row.isText || !row.higherIsBetter) continue;
      const vals = columns
        .map((col) => {
          const v = getFieldValue(row.key, col.shot ?? null, col.averaged);
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        })
        .filter((v): v is number => v !== null);
      if (vals.length > 1) {
        map[row.key] = Math.max(...vals);
      }
    }
    return map;
  }, [columns]);

  if (shots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
        No shots recorded for this bean yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slot configs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map((slot, i) => (
          <SlotSelector
            key={slot.id}
            slot={slot}
            onChange={(updated) => {
              const next = [...slots];
              next[i] = updated;
              onSlotsChange(next);
            }}
            onRemove={() => onSlotsChange(slots.filter((_, idx) => idx !== i))}
            totalNonHidden={nonHiddenCount}
          />
        ))}
        {slots.length < 3 && (
          <button
            type="button"
            onClick={addSlot}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-4 py-3 text-sm text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-600 dark:border-stone-700 dark:hover:border-stone-500 dark:hover:text-stone-400"
          >
            <PlusIcon className="h-4 w-4" />
            Add column
          </button>
        )}
      </div>

      {/* Matrix table */}
      {slots.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
                <th className="w-36 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Parameter
                </th>
                {columns.map((col, i) => (
                  <th key={i} className="border-l-2 border-amber-400 px-4 py-3 text-center first:border-l-0 dark:border-amber-500">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      {col.label}
                      {col.isAverage && (
                        <span className="ml-1 text-xs font-normal text-stone-400">avg</span>
                      )}
                    </p>
                    {col.sublabel && (
                      <p className="text-xs font-normal text-stone-400 dark:text-stone-500">
                        {col.sublabel}
                      </p>
                    )}
                    {col.isEmpty && (
                      <p className="text-xs font-normal text-amber-500 dark:text-amber-400">
                        No shot found
                      </p>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                  <td className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    {row.label}
                    {row.unit && (
                      <span className="ml-1 text-stone-400 dark:text-stone-600">{row.unit}</span>
                    )}
                  </td>
                  {columns.map((col, i) => {
                    const value = col.isEmpty
                      ? "—"
                      : getFieldValue(row.key, col.shot ?? null, col.averaged);
                    const numVal = parseFloat(value);
                    const isBest =
                      row.higherIsBetter &&
                      !isNaN(numVal) &&
                      bestValues[row.key] !== undefined &&
                      numVal === bestValues[row.key];
                    
                    // Handle array fields (flavors, bodyTexture, adjectives) specially
                    const isArrayField = row.key === "flavors" || row.key === "bodyTexture" || row.key === "adjectives";
                    const arrayValue = isArrayField && !col.isEmpty && col.shot
                      ? (col.shot[row.key] as string[] | null)
                      : null;
                    
                    return (
                      <td
                        key={i}
                        className={cn(
                          "border-l-2 border-amber-400 px-4 py-2.5 text-center first:border-l-0 dark:border-amber-500",
                          row.isText && !isArrayField
                            ? "max-w-xs truncate text-xs text-stone-600 dark:text-stone-400"
                            : isArrayField
                              ? "text-xs"
                              : "font-mono text-sm",
                          col.isEmpty
                            ? "text-stone-300 dark:text-stone-600"
                            : isBest
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : "text-stone-700 dark:text-stone-300",
                        )}
                      >
                        {isArrayField && arrayValue && arrayValue.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {arrayValue.map((item, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Flavor depth cache ────────────────────────────────────────────────

function buildFlavorDepthCache(): Map<string, number> {
  const cache = new Map<string, number>();
  
  function traverse(node: FlavorNode, depth: number): void {
    // Store this node's depth (depth 1 = first level, depth 2 = second level, etc.)
    cache.set(node.name, depth);
    
    // Recursively traverse children
    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  }
  
  // Start from top-level categories (depth 1)
  for (const category of FLAVOR_WHEEL_DATA.children) {
    traverse(category, 1);
  }
  
  return cache;
}

// Build cache once at module level
const FLAVOR_DEPTH_CACHE = buildFlavorDepthCache();

// ── Flavor ratings chart ──────────────────────────────────────────────

function FlavorRatingsChart({ beanId }: { beanId: string }) {
  const { data, isLoading } = useFlavorStats(beanId);
  const [selectedDepth, setSelectedDepth] = useState<number | null>(null);
  
  const allFlavors = data?.flavors ?? [];
  
  // Filter flavors by selected depth
  const flavors = useMemo(() => {
    if (selectedDepth === null) {
      return allFlavors;
    }
    return allFlavors.filter((f) => {
      const depth = FLAVOR_DEPTH_CACHE.get(f.flavor);
      return depth === selectedDepth;
    });
  }, [allFlavors, selectedDepth]);

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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Flavor Ratings
        </h3>
        <select
          value={selectedDepth === null ? "" : selectedDepth}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedDepth(value === "" ? null : parseInt(value, 10));
          }}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:focus:border-amber-500"
        >
          <option value="">All Depths</option>
          <option value="1">Depth 1</option>
          <option value="2">Depth 2</option>
          <option value="3">Depth 3</option>
        </select>
      </div>
      {flavors.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-stone-400 dark:text-stone-500">
          No flavors found at selected depth
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(280, flavors.length * 30)}>
          <BarChart data={flavors} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              formatter={(value, _name, props) => [
                `${value}/5 (${(props as { payload: { count: number } }).payload.count} shots)`,
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
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function BeanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: bean, isLoading, refetch } = useBean(id);
  const { data: shotsRaw, isLoading: shotsLoading } = useBeanShots(id);
  const { data: allBeans } = useBeans();
  const updateBean = useUpdateBean();

  const shots = (shotsRaw ?? []) as ShotRow[];

  // ── Edit modal state ────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrigin, setEditOrigin] = useState("");
  const [editRoaster, setEditRoaster] = useState("");
  const [editOriginDetails, setEditOriginDetails] = useState("");
  const [editProcessing, setEditProcessing] = useState("");
  const [editRoast, setEditRoast] = useState<string>(ROAST_LEVELS[2]);
  const [editRoastDate, setEditRoastDate] = useState("");
  const [editOpenBagDate, setEditOpenBagDate] = useState("");
  const [editIsRoastDateBestGuess, setEditIsRoastDateBestGuess] = useState(false);

  const handleEditOpen = useCallback(() => {
    if (!bean) return;
    setEditName(bean.name);
    setEditOrigin(bean.origin ?? "");
    setEditRoaster(bean.roaster ?? "");
    setEditOriginDetails(bean.originDetails ?? "");
    setEditProcessing(bean.processingMethod ?? "");
    setEditRoast(bean.roastLevel);
    setEditRoastDate(
      bean.roastDate ? new Date(bean.roastDate).toISOString().split("T")[0] : "",
    );
    setEditOpenBagDate(
      bean.openBagDate ? new Date(bean.openBagDate).toISOString().split("T")[0] : "",
    );
    setEditIsRoastDateBestGuess(bean.isRoastDateBestGuess ?? false);
    setShowEdit(true);
  }, [bean]);

  const handleEditSave = useCallback(async () => {
    if (!editName.trim()) return;
    await updateBean.mutateAsync({
      id,
      data: {
        name: editName.trim(),
        origin: editOrigin.trim() || undefined,
        roaster: editRoaster.trim() || undefined,
        originDetails: editOriginDetails.trim() || undefined,
        processingMethod: editProcessing ? (editProcessing as any) : undefined,
        roastLevel: editRoast as any,
        roastDate: editRoastDate ? new Date(editRoastDate) : undefined,
        openBagDate: editOpenBagDate ? new Date(editOpenBagDate) : undefined,
        isRoastDateBestGuess: editIsRoastDateBestGuess,
      },
    });
    setShowEdit(false);
    refetch();
  }, [
    id,
    editName,
    editOrigin,
    editRoaster,
    editOriginDetails,
    editProcessing,
    editRoast,
    editRoastDate,
    editOpenBagDate,
    editIsRoastDateBestGuess,
    updateBean,
    refetch,
  ]);

  // ── Share ───────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ── Comparison slots ─────────────────────────────────────────────
  const [slots, setSlots] = useState<SlotConfig[]>([
    { id: "default-1", type: "best-rating", shotNumber: 1, dateFrom: "", dateTo: "" },
  ]);

  const originSuggestions = useMemo(
    () =>
      Array.from(
        new Set((allBeans ?? []).map((b) => b.origin).filter(Boolean) as string[]),
      ).sort(),
    [allBeans],
  );
  const roasterSuggestions = useMemo(
    () =>
      Array.from(
        new Set((allBeans ?? []).map((b) => b.roaster).filter(Boolean) as string[]),
      ).sort(),
    [allBeans],
  );

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-28 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (!bean) {
    return <div className="py-16 text-center text-stone-500">Bean not found.</div>;
  }

  const nonHiddenShots = shots.filter((s) => !s.isHidden);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 pt-4 text-sm text-stone-500 dark:text-stone-400 sm:pt-0">
        <Link
          href={AppRoutes.beans.path}
          className="hover:text-stone-700 dark:hover:text-stone-300"
        >
          Beans
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="truncate text-stone-800 dark:text-stone-200">{bean.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-stone-800 dark:text-stone-200">
            {bean.name}
          </h1>
          {bean.roaster && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{bean.roaster}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <ShareIcon className="h-4 w-4" />
            {copied ? "Copied!" : "Share"}
          </button>
          <button
            type="button"
            onClick={handleEditOpen}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Bean info */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoField label="Roast Level" value={bean.roastLevel} />
          <InfoField label="Origin" value={bean.origin} />
          <InfoField label="Origin Details" value={bean.originDetails} />
          <InfoField label="Roaster" value={bean.roaster} />
          <InfoField label="Processing" value={bean.processingMethod} />
          <InfoField
            label={bean.isRoastDateBestGuess ? "Roast Date (est.)" : "Roast Date"}
            value={bean.roastDate ? fmtDate(bean.roastDate) : null}
          />
          <InfoField
            label="Open Bag Date"
            value={bean.openBagDate ? fmtDate(bean.openBagDate) : null}
          />
          <InfoField
            label="Shots Logged"
            value={shotsLoading ? "…" : String(nonHiddenShots.length)}
          />
        </div>
      </div>

      {/* Flavor ratings chart */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Flavor Ratings
        </h2>
        <FlavorRatingsChart beanId={id} />
      </div>

      {/* Shot comparison matrix */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Shot Comparison
        </h2>
        {shotsLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        ) : (
          <ComparisonMatrix shots={shots} slots={slots} onSlotsChange={setSlots} />
        )}
      </div>

      {/* Edit modal */}
      <BeanFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Bean"
        submitLabel={updateBean.isPending ? "Saving…" : "Save"}
        onSubmit={handleEditSave}
        isSubmitting={updateBean.isPending}
        name={editName}
        onNameChange={setEditName}
        origin={editOrigin}
        onOriginChange={setEditOrigin}
        originSuggestions={originSuggestions}
        originDetails={editOriginDetails}
        onOriginDetailsChange={setEditOriginDetails}
        roaster={editRoaster}
        onRoasterChange={setEditRoaster}
        roasterSuggestions={roasterSuggestions}
        processing={editProcessing}
        onProcessingChange={setEditProcessing}
        roast={editRoast}
        onRoastChange={setEditRoast}
        roastDate={editRoastDate}
        onRoastDateChange={setEditRoastDate}
        openBagDate={editOpenBagDate}
        onOpenBagDateChange={setEditOpenBagDate}
        isRoastDateBestGuess={editIsRoastDateBestGuess}
        onIsRoastDateBestGuessChange={setEditIsRoastDateBestGuess}
      />
    </div>
  );
}
