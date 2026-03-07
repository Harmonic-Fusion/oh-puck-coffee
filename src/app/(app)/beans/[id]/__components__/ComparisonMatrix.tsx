"use client";

import { useMemo } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { BeanShotContributor } from "@/components/beans/hooks";

// ── Types ────────────────────────────────────────────────────────────

export type ShotSlotType =
  | "best-rating"
  | "reference"
  | "shot-number"
  | "typical"
  | "average";

export interface SlotConfig {
  id: string;
  userId?: string; // undefined = current user (no filter by user)
  type: ShotSlotType;
  shotNumber: number;
  dateFrom: string;
  dateTo: string;
}

export interface ShotRow {
  id: string;
  userId: string;
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
  | "dose"
  | "yield"
  | "ratio"
  | "brewTime"
  | "grindLevel"
  | "brewTemp"
  | "preInfusion"
  | "pressure"
  | "flowRate"
  | "quality"
  | "rating"
  | "bitter"
  | "sour"
  | "notes"
  | "flavors"
  | "bodyTexture"
  | "adjectives"
  | "date"
  | "daysPostRoast";

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

// ── Helpers ───────────────────────────────────────────────────────────

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

function avgNum(
  arr: ShotRow[],
  getter: (s: ShotRow) => number | null,
): number | null {
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
    case "flavors":
      return shot.flavors && shot.flavors.length > 0 ? shot.flavors.join(", ") : "—";
    case "bodyTexture":
      return shot.bodyTexture && shot.bodyTexture.length > 0 ? shot.bodyTexture.join(", ") : "—";
    case "adjectives":
      return shot.adjectives && shot.adjectives.length > 0 ? shot.adjectives.join(", ") : "—";
    case "notes": return shot.notes ?? "—";
    case "date": return fmtDate(shot.createdAt);
    case "daysPostRoast":
      return shot.daysPostRoast != null ? String(shot.daysPostRoast) : "—";
  }
}

interface ResolvedColumn {
  label: string;
  sublabel?: string;
  userLabel?: string;
  isAverage?: boolean;
  shot?: ShotRow;
  averaged?: Record<string, number | null>;
  isEmpty?: boolean;
}

function resolveSlot(slot: SlotConfig, shots: ShotRow[]): ResolvedColumn {
  // Filter to the selected user's shots (or all if no userId set)
  const userShots = slot.userId
    ? shots.filter((s) => s.userId === slot.userId)
    : shots;

  const nonHidden = [...userShots]
    .filter((s) => !s.isHidden)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const filterByRange = (arr: ShotRow[]): ShotRow[] => {
    let f = arr;
    if (slot.dateFrom)
      f = f.filter((s) => new Date(s.createdAt) >= new Date(slot.dateFrom));
    if (slot.dateTo) {
      const end = new Date(slot.dateTo);
      end.setHours(23, 59, 59, 999);
      f = f.filter((s) => new Date(s.createdAt) <= end);
    }
    return f;
  };

  switch (slot.type) {
    case "best-rating": {
      const sorted = [...userShots].sort((a, b) => {
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
      const refs = userShots
        .filter((s) => s.isReferenceShot)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      const shot = refs[0];
      return shot
        ? { label: "Reference", shot }
        : { label: "Reference", isEmpty: true };
    }

    case "shot-number": {
      const n = Math.max(1, slot.shotNumber || 1);
      const shot = nonHidden[n - 1];
      return shot
        ? { label: `Shot #${n}`, sublabel: fmtDate(shot.createdAt), shot }
        : { label: `Shot #${n}`, isEmpty: true };
    }

    case "typical": {
      const filtered = filterByRange([...userShots]).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const mid = Math.floor(filtered.length / 2);
      const shot = filtered[mid];
      const sub =
        slot.dateFrom && slot.dateTo
          ? `${fmtDate(slot.dateFrom)} – ${fmtDate(slot.dateTo)}`
          : undefined;
      return shot
        ? { label: "Typical", sublabel: sub, shot }
        : { label: "Typical", isEmpty: true };
    }

    case "average": {
      const filtered = filterByRange(userShots);
      if (!filtered.length) return { label: "Average", isEmpty: true };
      const sub =
        slot.dateFrom && slot.dateTo
          ? `${fmtDate(slot.dateFrom)} – ${fmtDate(slot.dateTo)}`
          : `${filtered.length} shots`;
      const n = (getter: (s: ShotRow) => number | null) =>
        avgNum(filtered, getter);
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

// ── Slot type options ────────────────────────────────────────────────

const SLOT_TYPE_OPTIONS: { value: ShotSlotType; label: string }[] = [
  { value: "best-rating", label: "Best Rating" },
  { value: "reference", label: "Reference Shot" },
  { value: "shot-number", label: "Shot #" },
  { value: "typical", label: "Typical (date range)" },
  { value: "average", label: "Average (date range)" },
];

// ── SlotSelector ──────────────────────────────────────────────────────

function SlotSelector({
  slot,
  onChange,
  onRemove,
  totalNonHidden,
  contributors,
  currentUserId,
}: {
  slot: SlotConfig;
  onChange: (updated: SlotConfig) => void;
  onRemove: () => void;
  totalNonHidden: number;
  contributors: BeanShotContributor[];
  currentUserId: string;
}) {
  const upd = (partial: Partial<SlotConfig>) =>
    onChange({ ...slot, ...partial });

  const hasMultipleUsers = contributors.length > 1;

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1.5">
        {/* User picker — only shown when there are multiple contributors */}
        {hasMultipleUsers && (
          <select
            value={slot.userId ?? currentUserId}
            onChange={(e) => upd({ userId: e.target.value })}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            {contributors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.isCurrentUser
                  ? `You (${c.userName ?? "me"})`
                  : (c.userName ?? "Unknown")}
              </option>
            ))}
          </select>
        )}

        {/* Shot type picker */}
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

        {/* Shot number input */}
        {slot.type === "shot-number" && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-stone-500">Shot #</label>
            <input
              type="number"
              min={1}
              max={totalNonHidden || 1}
              value={slot.shotNumber}
              onChange={(e) =>
                upd({ shotNumber: parseInt(e.target.value) || 1 })
              }
              className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            />
            <span className="text-xs text-stone-400">of {totalNonHidden}</span>
          </div>
        )}

        {/* Date range input */}
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

// ── ComparisonMatrix ─────────────────────────────────────────────────

export function ComparisonMatrix({
  shots,
  slots,
  onSlotsChange,
  contributors,
  currentUserId,
}: {
  shots: ShotRow[];
  slots: SlotConfig[];
  onSlotsChange: (slots: SlotConfig[]) => void;
  contributors: BeanShotContributor[];
  currentUserId: string;
}) {
  const nonHiddenCount = shots
    .filter((s) => !s.isHidden && (!slots[0]?.userId || s.userId === slots[0]?.userId))
    .length;

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
        userId: currentUserId,
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

  // Get user display label for a slot
  const getUserLabel = (slot: SlotConfig) => {
    if (!slot.userId || contributors.length <= 1) return null;
    const contributor = contributors.find((c) => c.userId === slot.userId);
    if (!contributor) return null;
    return contributor.isCurrentUser ? "You" : (contributor.userName ?? "Unknown");
  };

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
            contributors={contributors}
            currentUserId={currentUserId}
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
                {columns.map((col, i) => {
                  const userLabel = getUserLabel(slots[i]);
                  return (
                    <th
                      key={i}
                      className="border-l border-stone-200 px-4 py-3 text-center first:border-l-0 dark:border-stone-700"
                    >
                      {userLabel && (
                        <p className="mb-0.5 text-xs font-medium text-amber-600 dark:text-amber-500">
                          {userLabel}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                        {col.label}
                        {col.isAverage && (
                          <span className="ml-1 text-xs font-normal text-stone-400">
                            avg
                          </span>
                        )}
                      </p>
                      {col.sublabel && (
                        <p className="text-xs font-normal text-stone-400 dark:text-stone-500">
                          {col.sublabel}
                        </p>
                      )}
                      {col.isEmpty && (
                        <p className="text-xs font-normal text-stone-400 dark:text-stone-500">
                          No shot found
                        </p>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.key}
                  className="hover:bg-stone-50 dark:hover:bg-stone-800/30"
                >
                  <td className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    {row.label}
                    {row.unit && (
                      <span className="ml-1 text-stone-400 dark:text-stone-600">
                        {row.unit}
                      </span>
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

                    const isArrayField =
                      row.key === "flavors" ||
                      row.key === "bodyTexture" ||
                      row.key === "adjectives";
                    const arrayValue =
                      isArrayField && !col.isEmpty && col.shot
                        ? row.key === "flavors"
                          ? col.shot.flavors
                          : row.key === "bodyTexture"
                            ? col.shot.bodyTexture
                            : col.shot.adjectives
                        : null;

                    return (
                      <td
                        key={i}
                        className={cn(
                          "border-l border-stone-200 px-4 py-2.5 text-center first:border-l-0 dark:border-stone-700",
                          row.isText && !isArrayField
                            ? "max-w-xs truncate text-xs text-stone-600 dark:text-stone-400"
                            : isArrayField
                              ? "text-xs"
                              : "font-mono text-sm",
                          col.isEmpty
                            ? "text-stone-300 dark:text-stone-600"
                            : isBest
                              ? "font-semibold text-stone-900 dark:text-stone-100"
                              : "text-stone-700 dark:text-stone-300",
                        )}
                      >
                        {isArrayField && arrayValue && arrayValue.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {arrayValue.map((item, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
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
