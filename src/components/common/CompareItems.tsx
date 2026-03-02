"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

export type CompareFieldType = "text" | "number" | "date" | "rating" | "tags";

export interface CompareFieldConfig {
  field: string;
  label: string;
  type: CompareFieldType;
  unit?: string;
  higherIsBetter?: boolean;
}

export interface CompareItemsProps<T extends Record<string, unknown>> {
  /** Row definitions — each entry is one row in the comparison table */
  config: CompareFieldConfig[];
  /** The data items (columns in the table) */
  items: T[];
  /** Maximum number of items to compare (default: 3) */
  maxItems?: number;
  /** Rendered inside an "add column" slot when items.length < maxItems */
  itemSelector?: ReactNode;
  /** Called with the item's array index when the user clicks remove */
  onDeselect?: (index: number) => void;
  /** Optional header renderer per item; receives the item and its index */
  renderItemHeader?: (item: T, index: number) => ReactNode;
  /** Optional empty-state for when no items are provided */
  emptyState?: ReactNode;
}

// ── Value formatting ──────────────────────────────────────────────────

function formatValue(value: unknown, type: CompareFieldType, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (type) {
    case "number": {
      const n = typeof value === "string" ? parseFloat(value) : Number(value);
      if (isNaN(n)) return "—";
      const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
      return unit ? `${formatted} ${unit}` : formatted;
    }
    case "date": {
      const d = value instanceof Date ? value : new Date(String(value));
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    case "rating": {
      const n = typeof value === "string" ? parseFloat(value) : Number(value);
      if (isNaN(n)) return "—";
      return `★ ${n.toFixed(1)}`;
    }
    case "tags": {
      if (!Array.isArray(value)) return String(value);
      return value.length > 0 ? value.join("\n") : "—";
    }
    case "text":
    default:
      return String(value);
  }
}

function getNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(n) ? null : n;
}

// ── Component ────────────────────────────────────────────────────────

export function CompareItems<T extends Record<string, unknown>>({
  config,
  items,
  maxItems = 3,
  itemSelector,
  onDeselect,
  renderItemHeader,
  emptyState,
}: CompareItemsProps<T>) {
  if (items.length === 0 && !itemSelector) {
    return (
      <div className="py-12 text-center text-sm text-stone-400 dark:text-stone-500">
        {emptyState ?? "No items to compare."}
      </div>
    );
  }

  // Compute best numeric values per row for highlighting
  const bestValues: Record<string, number> = {};
  for (const field of config) {
    if (field.type !== "number" && field.type !== "rating") continue;
    if (!field.higherIsBetter) continue;
    const vals = items
      .map((item) => getNumericValue(item[field.field]))
      .filter((v): v is number => v !== null);
    if (vals.length > 1) {
      bestValues[field.field] = Math.max(...vals);
    }
  }

  const showAddSlot = items.length < maxItems && itemSelector != null;

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            {/* Field label column */}
            <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Field
            </th>

            {/* Item columns */}
            {items.map((item, i) => (
              <th key={i} className="min-w-[160px] border-l-2 border-amber-400 px-4 py-3 text-center align-top first:border-l-0 dark:border-amber-500">
                {renderItemHeader ? (
                  <div className="relative">
                    {renderItemHeader(item, i)}
                    {onDeselect && (
                      <button
                        type="button"
                        onClick={() => onDeselect(i)}
                        className="absolute -right-2 -top-2 rounded-full bg-stone-200 p-0.5 text-stone-500 hover:bg-stone-300 hover:text-stone-700 dark:bg-stone-700 dark:text-stone-400 dark:hover:bg-stone-600"
                        aria-label="Remove"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M9 3L6 6m0 0L3 9m3-3L9 9M6 6L3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      Item {i + 1}
                    </span>
                    {onDeselect && (
                      <button
                        type="button"
                        onClick={() => onDeselect(i)}
                        className="rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
                        aria-label="Remove"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M2 2l10 10M12 2L2 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </th>
            ))}

            {/* Add-item slot */}
            {showAddSlot && (
              <th className="min-w-[160px] px-4 py-3 text-center align-middle">
                {itemSelector}
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {config.map((field) => (
            <tr key={field.field} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
              {/* Field label */}
              <td className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                {field.label}
                {field.unit && (
                  <span className="ml-1 text-stone-400 dark:text-stone-600">{field.unit}</span>
                )}
              </td>

              {/* Values */}
              {items.map((item, i) => {
                const raw = item[field.field];
                const display = formatValue(raw, field.type, undefined);
                const numVal = getNumericValue(raw);
                const isBest =
                  field.higherIsBetter &&
                  numVal !== null &&
                  bestValues[field.field] !== undefined &&
                  numVal === bestValues[field.field];

                return (
                  <td
                    key={i}
                    className={cn(
                      "border-l-2 border-amber-400 px-4 py-2.5 text-center first:border-l-0 dark:border-amber-500",
                      field.type === "text"
                        ? "max-w-[200px] truncate text-xs text-stone-600 dark:text-stone-400"
                        : field.type === "tags"
                          ? "max-w-[200px] text-xs text-stone-600 dark:text-stone-400"
                          : field.type === "rating"
                            ? "text-sm"
                            : "font-mono text-sm",
                      isBest
                        ? "font-semibold text-amber-600 dark:text-amber-400"
                        : "text-stone-700 dark:text-stone-300",
                      display === "—" && "text-stone-300 dark:text-stone-600",
                    )}
                  >
                    {field.type === "tags" && Array.isArray(raw) && raw.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {raw.map((tag, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      display
                    )}
                  </td>
                );
              })}

              {/* Empty add-item cells */}
              {showAddSlot && (
                <td className="px-4 py-2.5 text-center text-stone-300 dark:text-stone-700">—</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
