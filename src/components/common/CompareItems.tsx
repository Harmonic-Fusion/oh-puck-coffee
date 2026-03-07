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
  description?: string;
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

function formatValue(
  value: unknown,
  type: CompareFieldType,
  unit?: string,
): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (type) {
    case "number": {
      const n = typeof value === "string" ? parseFloat(value) : Number(value);
      if (isNaN(n)) return "—";
      const formatted = Number.isInteger(n)
        ? String(n)
        : n.toFixed(2).replace(/\.?0+$/, "");
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
      return value.length > 0 ? value.join(", ") : "—";
    }
    case "text":
    default:
      return String(value);
  }
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
              <th
                key={i}
                className="min-w-[160px] border-l border-stone-200 px-4 py-3 text-center align-top first:border-l-0 dark:border-stone-700"
              >
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
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 12 12"
                          fill="currentColor"
                        >
                          <path
                            d="M9 3L6 6m0 0L3 9m3-3L9 9M6 6L3 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
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
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
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
            <tr
              key={field.field}
              className="hover:bg-stone-50 dark:hover:bg-stone-800/30"
            >
              {/* Field label */}
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-stone-400">
                  {field.label}
                  {field.unit && (
                    <span className="ml-1 text-stone-400 dark:text-stone-600">
                      {field.unit}
                    </span>
                  )}
                  {field.description && (
                    <span className="relative ml-0.5 inline-flex group/tip">
                      <svg className="h-3 w-3 shrink-0 text-stone-300 dark:text-stone-600" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-9a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 6zm0-1.5a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75z" clipRule="evenodd" />
                      </svg>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-44 -translate-x-1/2 rounded-md bg-stone-800 px-2.5 py-1.5 text-[10px] leading-snug text-stone-100 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:bg-stone-700">
                        {field.description}
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800 dark:border-t-stone-700" />
                      </span>
                    </span>
                  )}
                </div>
              </td>

              {/* Values */}
              {items.map((item, i) => {
                const raw = item[field.field];
                const display = formatValue(raw, field.type, undefined);

                return (
                  <td
                    key={i}
                    className={cn(
                      "border-l border-stone-200 px-4 py-2.5 text-center first:border-l-0 dark:border-stone-700",
                      field.type === "text" || field.type === "tags"
                        ? "max-w-[200px] truncate text-xs text-stone-600 dark:text-stone-400"
                        : field.type === "rating"
                          ? "text-sm"
                          : "font-mono text-sm",
                      "text-stone-700 dark:text-stone-300",
                      display === "—" && "text-stone-300 dark:text-stone-600",
                    )}
                  >
                    {display}
                  </td>
                );
              })}

              {/* Empty add-item cells */}
              {showAddSlot && (
                <td className="px-4 py-2.5 text-center text-stone-300 dark:text-stone-700">
                  —
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
