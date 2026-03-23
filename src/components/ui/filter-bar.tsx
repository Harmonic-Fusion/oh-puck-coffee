"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import type { Column, RowData, Table } from "@tanstack/react-table";
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (!isSorted) {
    return (
      <ChevronUpIcon className="ml-1 inline h-3 w-3 text-stone-300 dark:text-stone-600" />
    );
  }
  return isSorted === "asc" ? (
    <ChevronUpIcon className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDownIcon className="ml-1 inline h-3 w-3" />
  );
}

export type MultiSelectOption = { label: string; value: string };

function cycleColumnSort<TData extends RowData>(column: Column<TData, unknown>) {
  const sorted = column.getIsSorted();
  if (sorted === false) {
    column.toggleSorting(false);
  } else if (sorted === "asc") {
    column.toggleSorting(true);
  } else {
    column.clearSorting();
  }
}

export function MultiSelectFilter<TData extends RowData>({
  column,
  options,
}: {
  column: Column<TData, unknown> | undefined;
  options: MultiSelectOption[];
}) {
  const filterValue = column?.getFilterValue();
  const header = column?.columnDef.header as string;
  const selected = useMemo(() => {
    const raw = filterValue;
    return Array.isArray(raw)
      ? (raw as string[])
      : raw != null
        ? [String(raw)]
        : [];
  }, [filterValue]);

  const toggle = useCallback(
    (value: string) => {
      if (!column) return;
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      column.setFilterValue(next.length > 0 ? next : undefined);
    },
    [column, selected],
  );

  const cycleSort = useCallback(() => {
    if (!column) return;
    cycleColumnSort(column);
  }, [column]);

  const count = selected.length;
  const buttonLabel = header;
  const sortState = column?.getIsSorted() ?? false;
  const sortLabel =
    sortState === false ? "" : sortState === "asc" ? "Ascending" : "Descending";
  const isHighlighted = count > 0 || sortState !== false;

  if (!column) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 min-w-25 max-w-[12rem] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:max-w-none",
          isHighlighted
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
        )}
        title={count > 0 ? String(count) : undefined}
      >
        <span className="truncate">{buttonLabel}</span>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            {count}
          </span>
        )}
        <SortIcon isSorted={sortState} />
      </PopoverTrigger>
      <PopoverContent className="flex max-h-72 w-56 flex-col gap-2 overflow-hidden rounded-lg p-0">
        <div className="shrink-0 space-y-2 border-b border-stone-200 px-3 pb-2 pt-3 dark:border-stone-700">
          <p className="whitespace-pre-wrap break-words text-xs leading-snug text-stone-800 dark:text-stone-200">
            {header}
          </p>
          {column.getCanSort() && (
            <button
              type="button"
              onClick={cycleSort}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                sortState !== false
                  ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700",
              )}
              aria-label={sortLabel}
            >
              <span className="flex items-center gap-1.5">
                <ArrowsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                {sortLabel}
              </span>
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {options.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-stone-400">No options</p>
          )}
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
                  isChecked
                    ? "bg-amber-50 font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                    : "text-stone-700 dark:text-stone-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(opt.value)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
          {count > 0 && (
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="mt-1 w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DateRangeFilter<TData extends RowData>({
  column,
  placeholder: placeholderProp,
}: {
  column: Column<TData, unknown> | undefined;
  /** Shown when no range is selected; defaults to the column header string. */
  placeholder?: string;
}) {
  const filterValue = column?.getFilterValue() as [string, string] | undefined;
  const range: DateRange | undefined = useMemo(
    () =>
      filterValue
        ? {
            from: filterValue[0] ? new Date(filterValue[0]) : undefined,
            to: filterValue[1] ? new Date(filterValue[1]) : undefined,
          }
        : undefined,
    [filterValue],
  );

  const headerFromDef =
    column && typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : null;
  const header = headerFromDef ?? placeholderProp ?? "Date";

  const handleChange = useCallback(
    (r: DateRange | undefined) => {
      if (!column) return;
      if (!r || (!r.from && !r.to)) {
        column.setFilterValue(undefined);
      } else {
        column.setFilterValue([
          r.from ? format(r.from, "yyyy-MM-dd") : "",
          r.to ? format(r.to, "yyyy-MM-dd") : "",
        ]);
      }
    },
    [column],
  );

  const cycleSort = useCallback(() => {
    if (!column) return;
    cycleColumnSort(column);
  }, [column]);

  const sortState = column?.getIsSorted() ?? false;
  const sortLabel =
    sortState === false ? "" : sortState === "asc" ? "Ascending" : "Descending";
  const hasFilter = Boolean(range?.from || range?.to);
  const isHighlighted = hasFilter || sortState !== false;

  const rangeSummary = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
    }
    if (range?.from) {
      return format(range.from, "MMM d, yyyy");
    }
    return null;
  }, [range]);

  const fullSummaryText = hasFilter && rangeSummary ? `${header}: ${rangeSummary}` : header;

  if (!column) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 min-w-25 max-w-[12rem] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:max-w-none",
          isHighlighted
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
        )}
        title={hasFilter && rangeSummary ? rangeSummary : undefined}
      >
        <span className="truncate">{header}</span>
        {hasFilter && (
          <span className="shrink-0 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            1
          </span>
        )}
        <SortIcon isSorted={sortState} />
      </PopoverTrigger>
      <PopoverContent className="flex w-auto max-w-[min(100vw-2rem,20rem)] flex-col gap-2 rounded-lg p-0">
        <div className="shrink-0 space-y-2 border-b border-stone-200 px-3 pb-2 pt-3 dark:border-stone-700">
          <p className="whitespace-pre-wrap break-words text-xs leading-snug text-stone-800 dark:text-stone-200">
            {fullSummaryText}
          </p>
          {column.getCanSort() && (
            <button
              type="button"
              onClick={cycleSort}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                sortState !== false
                  ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700",
              )}
              aria-label={sortLabel}
            >
              <span className="flex items-center gap-1.5">
                <ArrowsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                {sortLabel}
              </span>
            </button>
          )}
        </div>
        <div className="px-4 pb-2 pt-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleChange}
            numberOfMonths={1}
            initialFocus
          />
        </div>
        {hasFilter && (
          <div className="border-t border-stone-200 px-3 py-2 dark:border-stone-700">
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Same popover + checkbox UX as {@link MultiSelectFilter}, for pages without a data table (e.g. stats). */
export function StandaloneMultiSelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[] | undefined) => void;
}) {
  const selected = value;
  const toggle = useCallback(
    (v: string) => {
      const next = selected.includes(v)
        ? selected.filter((x) => x !== v)
        : [...selected, v];
      onChange(next.length > 0 ? next : undefined);
    },
    [selected, onChange],
  );

  const count = selected.length;
  const isHighlighted = count > 0;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 min-w-25 max-w-[12rem] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:max-w-none",
          isHighlighted
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
        )}
        title={count > 0 ? String(count) : undefined}
      >
        <span className="truncate">{label}</span>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            {count}
          </span>
        )}
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      </PopoverTrigger>
      <PopoverContent className="flex max-h-72 w-56 flex-col gap-2 overflow-hidden rounded-lg p-0">
        <div className="shrink-0 border-b border-stone-200 px-3 pb-2 pt-3 dark:border-stone-700">
          <p className="whitespace-pre-wrap break-words text-xs leading-snug text-stone-800 dark:text-stone-200">
            {label}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {options.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-stone-400">No options</p>
          )}
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
                  isChecked
                    ? "bg-amber-50 font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                    : "text-stone-700 dark:text-stone-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(opt.value)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="mt-1 w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Same popover + calendar UX as {@link DateRangeFilter}, for pages without a data table (e.g. stats). */
export function StandaloneDateRangeFilter({
  label = "Date range",
  value,
  onChange,
  numberOfMonths = 1,
}: {
  label?: string;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
}) {
  const range = value;
  const handleChange = useCallback(
    (r: DateRange | undefined) => {
      if (!r || (!r.from && !r.to)) {
        onChange(undefined);
      } else {
        onChange(r);
      }
    },
    [onChange],
  );

  const hasFilter = Boolean(range?.from || range?.to);
  const isHighlighted = hasFilter;

  const rangeSummary = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
    }
    if (range?.from) {
      return format(range.from, "MMM d, yyyy");
    }
    return null;
  }, [range]);

  const fullSummaryText = hasFilter && rangeSummary ? `${label}: ${rangeSummary}` : label;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 min-w-25 max-w-[12rem] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:max-w-none",
          isHighlighted
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
        )}
        title={hasFilter && rangeSummary ? rangeSummary : undefined}
      >
        <span className="truncate">{label}</span>
        {hasFilter && (
          <span className="shrink-0 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            1
          </span>
        )}
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      </PopoverTrigger>
      <PopoverContent className="flex w-auto max-w-[min(100vw-2rem,20rem)] flex-col gap-2 rounded-lg p-0">
        <div className="shrink-0 border-b border-stone-200 px-3 pb-2 pt-3 dark:border-stone-700">
          <p className="whitespace-pre-wrap break-words text-xs leading-snug text-stone-800 dark:text-stone-200">
            {fullSummaryText}
          </p>
        </div>
        <div className="px-4 pb-2 pt-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleChange}
            numberOfMonths={numberOfMonths}
            initialFocus
          />
        </div>
        {hasFilter && (
          <div className="border-t border-stone-200 px-3 py-2 dark:border-stone-700">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export type FilterDescriptor =
  | { columnId: string; options: MultiSelectOption[] }
  | { columnId: string };

/** Funnel + horizontal controls + optional reset (e.g. stats filters without a data table). */
export function FilterBarStrip({
  children,
  showReset,
  onReset,
  className,
}: {
  children: ReactNode;
  showReset?: boolean;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10", className)}>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <FunnelIcon className="h-4 w-4 shrink-0 text-stone-400" />
        {children}
        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            <XMarkIcon className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterBar<TData extends RowData>({
  table,
  filters,
}: {
  table: Table<TData>;
  filters: FilterDescriptor[];
}) {
  const activeCount = table.getState().columnFilters.length;

  return (
    <div className="relative z-10">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <FunnelIcon className="h-4 w-4 shrink-0 text-stone-400" />
        {filters.map((filter) => {
          const column = table.getColumn(filter.columnId);
          if ("options" in filter) {
            return (
              <MultiSelectFilter
                key={filter.columnId}
                column={column}
                options={filter.options}
              />
            );
          }
          return (
            <DateRangeFilter key={filter.columnId} column={column} />
          );
        })}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => table.resetColumnFilters()}
            className="inline-flex shrink-0 gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            <XMarkIcon className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
