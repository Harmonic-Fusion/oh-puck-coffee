"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type Column,
} from "@tanstack/react-table";
import {
  useShots,
  useDeleteShot,
  useToggleReference,
  useToggleHidden,
  useCreateShareLink,
  type ShotWithJoins,
} from "@/components/shots/hooks";
import { ShotDetail } from "@/components/shots/ShotDetail";
import { LongPressShareButton } from "@/components/shots/LongPressShareButton";
import { useToast } from "@/components/common/Toast";
import { AppRoutes, resolvePath } from "@/app/routes";
import { buildShareText, type ShotShareData } from "@/lib/share-text";
import { useTempUnit } from "@/lib/use-temp-unit";
import { cn } from "@/lib/utils";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { exportToCsv, type CSVColumn } from "@/lib/export-csv";

// ── Filter function helpers ────────────────────────────────────────

/** Multi-select: row matches if its value is in the selected set. */
function multiSelectFilterFn(
  rowValue: string | null | undefined,
  filterValues: string[]
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.includes(rowValue);
}

/** Numeric bucket: row matches if its rounded value is in the selected set. */
function numericBucketFilterFn(
  rowValue: number | null | undefined,
  filterValues: string[]
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.some((v) => Math.round(rowValue) === Number(v));
}

/** Date range: row matches if its date is within [from, to]. */
function dateRangeFilterFn(
  rowValue: string,
  filterValue: [string, string] // [from, to] as ISO date strings
): boolean {
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;
  const d = new Date(rowValue).getTime();
  if (filterValue[0] && d < new Date(filterValue[0]).getTime()) return false;
  if (filterValue[1]) {
    // Include the entire "to" day
    const toEnd = new Date(filterValue[1]);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd.getTime()) return false;
  }
  return true;
}

/** Boolean: row matches selected true/false values */
function booleanFilterFn(
  rowValue: boolean,
  filterValues: string[]
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  return filterValues.includes(String(rowValue));
}

// ── Column definitions ─────────────────────────────────────────────

const columnHelper = createColumnHelper<ShotWithJoins>();

const columns = [
  columnHelper.accessor("createdAt", {
    id: "date",
    header: "Date",
    cell: (info) =>
      new Date(info.getValue()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    sortingFn: "datetime",
    filterFn: (row, _id, value) =>
      dateRangeFilterFn(row.original.createdAt, value as [string, string]),
  }),
  columnHelper.accessor("beanName", {
    id: "bean",
    header: "Bean",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.beanName, value as string[]),
  }),
  columnHelper.accessor("doseGrams", {
    id: "dose",
    header: "Dose",
    cell: (info) => (info.getValue() ? `${info.getValue()}g` : "—"),
    enableColumnFilter: false,
  }),
  columnHelper.accessor("yieldGrams", {
    id: "yield",
    header: "Yield",
    cell: (info) => (info.getValue() ? `${info.getValue()}g` : "—"),
    enableColumnFilter: false,
  }),
  columnHelper.accessor("brewRatio", {
    id: "ratio",
    header: "Ratio",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? `1:${v}` : "—";
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("brewTimeSecs", {
    id: "time",
    header: "Time",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? `${v}s` : "—";
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("grindLevel", {
    id: "grind",
    header: "Grind",
    cell: (info) => info.getValue() ?? "—",
    enableColumnFilter: false,
  }),
  columnHelper.accessor("grinderName", {
    id: "grinder",
    header: "Grinder",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.grinderName, value as string[]),
  }),
  columnHelper.accessor("machineName", {
    id: "machine",
    header: "Machine",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.machineName, value as string[]),
  }),
  columnHelper.accessor("shotQuality", {
    id: "quality",
    header: "Quality",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? `${v}/5` : "—";
    },
    filterFn: (row, _id, value) =>
      numericBucketFilterFn(row.original.shotQuality, value as string[]),
  }),
  columnHelper.accessor("rating", {
    id: "rating",
    header: "Rating",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? `${v}/5` : "—";
    },
    filterFn: (row, _id, value) =>
      numericBucketFilterFn(row.original.rating, value as string[]),
  }),
  columnHelper.accessor("isReferenceShot", {
    id: "ref",
    header: "Ref",
    cell: (info) => (info.getValue() ? "⭐" : ""),
    enableSorting: false,
    filterFn: (row, _id, value) =>
      booleanFilterFn(row.original.isReferenceShot, value as string[]),
  }),
  columnHelper.accessor("userName", {
    id: "user",
    header: "User",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.userName, value as string[]),
  }),
];

// ── Mobile shot card ───────────────────────────────────────────────

interface ShotCardProps {
  shot: ShotWithJoins;
  tempUnit: "C" | "F";
  onToggleReference?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onClick?: (shot: ShotWithJoins) => void;
  onDuplicate?: (shot: ShotWithJoins) => void;
  onSelect?: (shot: ShotWithJoins) => void;
  isSelected?: boolean;
  isSelecting?: boolean;
}

function ShotCard({
  shot,
  tempUnit,
  onToggleReference,
  onToggleHidden,
  onClick,
  onDuplicate,
  onSelect,
  isSelected,
  isSelecting,
}: ShotCardProps) {
  const date = new Date(shot.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const ratio = shot.brewRatio != null ? `1:${shot.brewRatio}` : "—";
  const isRef = shot.isReferenceShot;
  const isHidden = shot.isHidden;

  // ── Long-press share setup ──────────────────────────────────────
  const createShareLink = useCreateShareLink();
  const shotIdRef = useRef(shot.id);
  shotIdRef.current = shot.id;

  const shotShareData = useMemo<ShotShareData>(
    () => ({
      beanName: shot.beanName,
      beanRoastLevel: shot.beanRoastLevel,
      beanOrigin: null,
      beanRoaster: null,
      beanRoastDate: shot.beanRoastDate
        ? new Date(shot.beanRoastDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
      beanProcessingMethod: null,
      shotQuality: shot.shotQuality,
      rating: shot.rating,
      bitter: shot.bitter,
      sour: shot.sour,
      doseGrams: parseFloat(shot.doseGrams),
      yieldGrams: parseFloat(shot.yieldGrams),
      yieldActualGrams: shot.yieldActualGrams
        ? parseFloat(shot.yieldActualGrams)
        : null,
      brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : null,
      grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : null,
      brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : null,
      brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : null,
      grinderName: shot.grinderName,
      machineName: shot.machineName,
      flavors: shot.flavors,
      bodyTexture: shot.bodyTexture,
      adjectives: shot.adjectives,
      notes: shot.notes,
    }),
    [shot]
  );

  const getShareUrl = useCallback(async (): Promise<string> => {
    const currentShotId = shotIdRef.current;
    if (!currentShotId) throw new Error("Shot ID is required");

    const shareData = await new Promise<{ id: string }>((resolve, reject) => {
      createShareLink.mutate(currentShotId, {
        onSuccess: (data) => resolve(data),
        onError: reject,
      });
    });

    if (!shareData?.id) throw new Error("Failed to create share link");
    return `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: shareData.id })}`;
  }, [createShareLink]);

  const handleShareAction = useCallback(
    async (text: string, shareUrl: string) => {
      const shareDataObj = {
        title: "Journey before Destination!",
        text,
        url: shareUrl,
      };

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        try {
          if (navigator.canShare(shareDataObj)) {
            await navigator.share(shareDataObj);
            return;
          }
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Error sharing:", err);
          }
        }
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch (clipboardErr) {
        console.error("Error copying to clipboard:", clipboardErr);
      }
    },
    []
  );

  return (
    <div
      onClick={() => {
        if (isSelecting && onSelect) {
          onSelect(shot);
        } else {
          onClick?.(shot);
        }
      }}
      className={cn(
        "relative rounded-xl border bg-white p-4 transition-colors dark:bg-stone-900",
        onClick || (isSelecting && onSelect)
          ? "cursor-pointer active:bg-stone-50 dark:active:bg-stone-800"
          : "",
        isRef
          ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10"
          : "border-stone-200 dark:border-stone-700",
        isSelected
          ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/30 dark:bg-amber-900/20"
          : ""
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-800 dark:text-stone-200">
            {shot.beanName ?? "Unknown Bean"}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">{date}</p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {shot.shotQuality}/5
          </span>
          {shot.rating != null && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {shot.rating}/5
            </span>
          )}
          {isRef && <StarIconSolid className="h-4 w-4 text-amber-500" />}
        </div>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Dose", value: shot.doseGrams ? `${shot.doseGrams}g` : "—" },
          { label: "Yield", value: shot.yieldGrams ? `${shot.yieldGrams}g` : "—" },
          { label: "Ratio", value: ratio },
          { label: "Time", value: shot.brewTimeSecs ? `${shot.brewTimeSecs}s` : "—" },
          { label: "Grind", value: shot.grindLevel ?? "—" },
          { label: "By", value: shot.userName ?? "—" },
        ].map((cell) => (
          <div
            key={cell.label}
            className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {cell.label}
            </p>
            <p className="truncate text-sm font-semibold text-stone-700 dark:text-stone-300">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {shot.notes && (
        <p className="mt-3 truncate border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          {shot.notes}
        </p>
      )}

      {/* Actions */}
      {(onToggleReference || onToggleHidden || onDuplicate || onSelect) && (
        <div
          className="mt-3 flex h-10 w-full items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {!isSelecting ? (
            <>
              {onToggleReference && (
                <button
                  onClick={() => onToggleReference(shot.id)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  title={isRef ? "Unmark reference" : "Mark reference"}
                >
                  <StarIcon
                    className={cn(
                      "h-5 w-5",
                      isRef
                        ? "fill-amber-500 text-amber-500"
                        : "text-stone-400 dark:text-stone-500"
                    )}
                  />
                </button>
              )}
              {onToggleHidden && (
                <button
                  onClick={() => onToggleHidden(shot.id)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                  title={isHidden ? "Show" : "Hide"}
                >
                  {isHidden ? (
                    <EyeSlashIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                  )}
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(shot)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                  title="Duplicate"
                >
                  <DocumentDuplicateIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                </button>
              )}
              <div className="flex h-10 flex-1">
                <LongPressShareButton
                  shotData={shotShareData}
                  tempUnit={tempUnit}
                  getShareUrl={getShareUrl}
                  onShare={handleShareAction}
                  className="h-10 w-full"
                  variant="ghost"
                  size="sm"
                >
                  <ShareIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                </LongPressShareButton>
              </div>
            </>
          ) : (
            <>
              {onToggleReference && <div className="h-10 flex-1" aria-hidden="true" />}
              {onToggleHidden && <div className="h-10 flex-1" aria-hidden="true" />}
              {onDuplicate && <div className="h-10 flex-1" aria-hidden="true" />}
              <div className="h-10 flex-1" aria-hidden="true" />
            </>
          )}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(shot);
              }}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
              title="Select"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Sort icon ──────────────────────────────────────────────────────

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
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

// ── Filter popover (multi-select) ──────────────────────────────────

function MultiSelectFilter({
  column,
  title,
  options,
}: {
  column: Column<ShotWithJoins, unknown>;
  title: string;
  options: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = useCallback(
    (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      column.setFilterValue(next.length > 0 ? next : undefined);
    },
    [column, selected]
  );

  const count = selected.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          count > 0
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        }`}
      >
        {title}
        {count > 0 && (
          <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {options.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-stone-400">
              No options
            </p>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
          {count > 0 && (
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="mt-1 w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Date range filter ──────────────────────────────────────────────

function DateRangeFilter({
  column,
}: {
  column: Column<ShotWithJoins, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const value = (column.getFilterValue() as [string, string] | undefined) ?? [
    "",
    "",
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasValue = value[0] || value[1];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          hasValue
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        }`}
      >
        Date
        {hasValue && (
          <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            !
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                From
              </span>
              <input
                type="date"
                value={value[0]}
                onChange={(e) =>
                  column.setFilterValue([e.target.value, value[1]])
                }
                className="mt-0.5 block w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                To
              </span>
              <input
                type="date"
                value={value[1]}
                onChange={(e) =>
                  column.setFilterValue([value[0], e.target.value])
                }
                className="mt-0.5 block w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              />
            </label>
          </div>
          {hasValue && (
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="mt-2 w-full rounded-md px-2 py-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter bar (shared between mobile + desktop) ───────────────────

function FilterBar({
  table,
  beanOptions,
  grinderOptions,
  machineOptions,
  userOptions,
}: {
  table: ReturnType<typeof useReactTable<ShotWithJoins>>;
  beanOptions: { label: string; value: string }[];
  grinderOptions: { label: string; value: string }[];
  machineOptions: { label: string; value: string }[];
  userOptions: { label: string; value: string }[];
}) {
  const ratingOptions = [1, 2, 3, 4, 5].map((n) => ({
    label: `${n}`,
    value: `${n}`,
  }));
  const qualityOptions = ratingOptions;
  const refOptions = [
    { label: "Reference", value: "true" },
    { label: "Not reference", value: "false" },
  ];

  const activeCount = table.getState().columnFilters.length;

  return (
    <div className="relative z-10 space-y-2">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FunnelIcon className="h-4 w-4 shrink-0 text-stone-400" />

        {table.getColumn("date") && (
          <DateRangeFilter column={table.getColumn("date")!} />
        )}
        {table.getColumn("bean") && (
          <MultiSelectFilter
            column={table.getColumn("bean")!}
            title="Bean"
            options={beanOptions}
          />
        )}
        {table.getColumn("grinder") && (
          <MultiSelectFilter
            column={table.getColumn("grinder")!}
            title="Grinder"
            options={grinderOptions}
          />
        )}
        {table.getColumn("machine") && (
          <MultiSelectFilter
            column={table.getColumn("machine")!}
            title="Machine"
            options={machineOptions}
          />
        )}
        {table.getColumn("quality") && (
          <MultiSelectFilter
            column={table.getColumn("quality")!}
            title="Quality"
            options={qualityOptions}
          />
        )}
        {table.getColumn("rating") && (
          <MultiSelectFilter
            column={table.getColumn("rating")!}
            title="Rating"
            options={ratingOptions}
          />
        )}
        {table.getColumn("ref") && (
          <MultiSelectFilter
            column={table.getColumn("ref")!}
            title="Ref"
            options={refOptions}
          />
        )}
        {table.getColumn("user") && (
          <MultiSelectFilter
            column={table.getColumn("user")!}
            title="User"
            options={userOptions}
          />
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => table.resetColumnFilters()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            <XMarkIcon className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {table.getState().columnFilters.map((f) => {
            const col = table.getColumn(f.id);
            const label = col
              ? String(
                  typeof col.columnDef.header === "string"
                    ? col.columnDef.header
                    : f.id
                )
              : f.id;
            const val = f.value;
            let display: string;
            if (Array.isArray(val) && val.length === 2 && f.id === "date") {
              const from = val[0] ? val[0] : "…";
              const to = val[1] ? val[1] : "…";
              display = `${from} → ${to}`;
            } else if (Array.isArray(val)) {
              display = val.length <= 2 ? val.join(", ") : `${val.length} selected`;
            } else {
              display = String(val);
            }
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {label}: {display}
                <button
                  type="button"
                  onClick={() => col?.setFilterValue(undefined)}
                  className="ml-0.5 hover:text-amber-600"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function ShotsPage() {
  const router = useRouter();
  const { data: shots, isLoading } = useShots();
  const deleteShot = useDeleteShot();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();
  const createShareLink = useCreateShareLink();
  const { showToast } = useToast();
  const [tempUnit] = useTempUnit();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);

  const data = useMemo(() => shots ?? [], [shots]);

  // ── Action handlers ───────────────────────────────────────────────

  const handleToggleReference = useCallback(
    (id: string) => {
      toggleReference.mutate(id, {
        onSuccess: (updatedShot) => {
          if (selectedShot?.id === id) {
            setSelectedShot((prev) =>
              prev ? { ...prev, isReferenceShot: updatedShot.isReferenceShot } : null
            );
          }
        },
      });
    },
    [toggleReference, selectedShot?.id]
  );

  const handleToggleHidden = useCallback(
    (id: string) => {
      toggleHidden.mutate(id, {
        onSuccess: (updatedShot) => {
          if (selectedShot?.id === id) {
            setSelectedShot((prev) =>
              prev ? { ...prev, isHidden: updatedShot.isHidden } : null
            );
          }
        },
      });
    },
    [toggleHidden, selectedShot?.id]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteShot.mutate(id);
      if (selectedShot?.id === id) setSelectedShot(null);
    },
    [deleteShot, selectedShot?.id]
  );

  const handleDuplicate = useCallback(
    (shot: ShotWithJoins) => {
      const params = new URLSearchParams();
      if (shot.beanId) params.set("beanId", shot.beanId);
      if (shot.grinderId) params.set("grinderId", shot.grinderId);
      if (shot.machineId) params.set("machineId", shot.machineId);
      if (shot.doseGrams) params.set("doseGrams", shot.doseGrams);
      if (shot.yieldGrams) params.set("yieldGrams", shot.yieldGrams);
      if (shot.grindLevel) params.set("grindLevel", shot.grindLevel);
      if (shot.brewTempC) params.set("brewTempC", shot.brewTempC);
      if (shot.preInfusionDuration) params.set("preInfusionDuration", shot.preInfusionDuration);
      if (shot.brewPressure) params.set("brewPressure", shot.brewPressure);
      if (shot.toolsUsed && shot.toolsUsed.length > 0) {
        params.set("toolsUsed", shot.toolsUsed.join(","));
      }
      router.push(`${AppRoutes.log.path}?${params.toString()}`);
    },
    [router]
  );

  const handleShare = useCallback(
    async (shot: ShotWithJoins) => {
      try {
        createShareLink.mutate(shot.id, {
          onSuccess: async (shareData) => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: shareData.id })}`;
            const shareText = buildShareText(
              {
                beanName: shot.beanName,
                beanRoastLevel: shot.beanRoastLevel,
                beanOrigin: null,
                beanRoaster: null,
                beanRoastDate: shot.beanRoastDate
                  ? new Date(shot.beanRoastDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : null,
                beanProcessingMethod: null,
                shotQuality: shot.shotQuality,
                rating: shot.rating,
                bitter: shot.bitter,
                sour: shot.sour,
                doseGrams: parseFloat(shot.doseGrams),
                yieldGrams: parseFloat(shot.yieldGrams),
                yieldActualGrams: shot.yieldActualGrams ? parseFloat(shot.yieldActualGrams) : null,
                brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : null,
                grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : null,
                brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : null,
                brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : null,
                grinderName: shot.grinderName,
                machineName: shot.machineName,
                flavors: shot.flavors,
                bodyTexture: shot.bodyTexture,
                adjectives: shot.adjectives,
                notes: shot.notes,
                url: shareUrl,
              },
              tempUnit
            );

            const shareDataObj = {
              title: "Journey before Destination!",
              text: shareText,
              url: shareUrl,
            };

            if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
              try {
                if (navigator.canShare(shareDataObj)) {
                  await navigator.share(shareDataObj);
                  return;
                }
              } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                  console.error("Error sharing:", err);
                }
              }
            }

            await navigator.clipboard.writeText(shareText);
            showToast("success", "Share link copied to clipboard");
          },
          onError: () => {
            showToast("error", "Failed to create share link");
          },
        });
      } catch (error) {
        console.error("Share error:", error);
        showToast("error", "Failed to share shot");
      }
    },
    [createShareLink, showToast, tempUnit]
  );

  const handleSelect = useCallback((shot: ShotWithJoins) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shot.id)) {
        next.delete(shot.id);
      } else {
        next.add(shot.id);
      }
      return next;
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  // Auto-toggle selection mode
  useEffect(() => {
    if (selectedIds.size > 0 && !isSelecting) {
      setIsSelecting(true);
    } else if (selectedIds.size === 0 && isSelecting) {
      setIsSelecting(false);
    }
  }, [selectedIds.size, isSelecting]);

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      for (const id of ids) deleteShot.mutate(id);
    },
    [deleteShot]
  );

  const handleBulkToggleReference = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => toggleReference.mutate(id));
    },
    [toggleReference]
  );

  const handleBulkSetHidden = useCallback(
    (ids: string[], hidden: boolean) => {
      if (!shots) return;
      const selected = shots.filter((s) => ids.includes(s.id));
      const toToggle = selected.filter((s) => s.isHidden !== hidden);
      for (const s of toToggle) toggleHidden.mutate(s.id);
    },
    [shots, toggleHidden]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase().trim();
      if (!q) return true;
      const s = row.original;
      return [s.beanName, s.grinderName, s.machineName, s.userName, s.notes].some(
        (f) => f != null && f.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.id,
  });

  const filteredRows = table.getFilteredRowModel().rows;

  // Handle CSV export
  const handleExport = useCallback(() => {
    const filteredRows = table.getFilteredRowModel().rows.map((row) => row.original);
    
    const columns: CSVColumn<ShotWithJoins>[] = [
      { id: "date", header: "Date", accessorFn: (row) => new Date(row.createdAt).toLocaleString() },
      { id: "bean", header: "Bean", accessorFn: (row) => row.beanName ?? "" },
      { id: "dose", header: "Dose (g)", accessorFn: (row) => row.doseGrams ?? "" },
      { id: "yield", header: "Yield (g)", accessorFn: (row) => row.yieldGrams ?? "" },
      { id: "ratio", header: "Ratio", accessorFn: (row) => row.brewRatio != null ? `1:${row.brewRatio}` : "" },
      { id: "time", header: "Time (s)", accessorFn: (row) => row.brewTimeSecs ?? "" },
      { id: "grind", header: "Grind", accessorFn: (row) => row.grindLevel ?? "" },
      { id: "grinder", header: "Grinder", accessorFn: (row) => row.grinderName ?? "" },
      { id: "machine", header: "Machine", accessorFn: (row) => row.machineName ?? "" },
      { id: "quality", header: "Quality", accessorFn: (row) => row.shotQuality ?? "" },
      { id: "rating", header: "Rating", accessorFn: (row) => row.rating ?? "" },
      { id: "ref", header: "Reference", accessorFn: (row) => row.isReferenceShot ? "Yes" : "No" },
      { id: "user", header: "User", accessorFn: (row) => row.userName ?? "" },
    ];

    const filename = `coffee-shots-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCsv(filename, filteredRows, columns);
  }, [table]);

  // Extract filtered shots array for navigation
  const filteredShots = useMemo(
    () => filteredRows.map((row) => row.original),
    [filteredRows]
  );

  // Build unique option lists from data for multi-select filters
  const beanOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((s) => {
      if (s.beanName) unique.add(s.beanName);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [data]);

  const grinderOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((s) => {
      if (s.grinderName) unique.add(s.grinderName);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [data]);

  const machineOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((s) => {
      if (s.machineName) unique.add(s.machineName);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [data]);

  const userOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((s) => {
      if (s.userName) unique.add(s.userName);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [data]);

  // ── Loading state ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Shots
        </h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">☕</span>
        <h3 className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-300">
          No shots yet
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Log your first espresso shot to see it here.
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Shots
        </h1>
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {filteredRows.length} shot{filteredRows.length !== 1 ? "s" : ""}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                Download CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Selection bar */}
      {isSelecting && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {selectedIds.size} {selectedIds.size === 1 ? "shot" : "shots"} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => {
                    const ids = Array.from(selectedIds);
                    if (confirm(`Delete ${ids.length} shot(s)?`)) {
                      handleBulkDelete(ids);
                      setSelectedIds(new Set());
                    }
                  }}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleBulkToggleReference(Array.from(selectedIds))}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
                >
                  Reference
                </button>
                <button
                  onClick={() => {
                    const ids = Array.from(selectedIds);
                    if (!shots) return;
                    const sel = shots.filter((s) => ids.includes(s.id));
                    const anyVisible = sel.some((s) => !s.isHidden);
                    handleBulkSetHidden(ids, anyVisible);
                  }}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
                >
                  Hide
                </button>
              </>
            )}
            <button
              onClick={handleDeselectAll}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search beans, grinders, machines, notes…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-500"
        />
        {globalFilter && (
          <button
            onClick={() => setGlobalFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter bar — visible on both mobile and desktop */}
      <FilterBar
        table={table}
        beanOptions={beanOptions}
        grinderOptions={grinderOptions}
        machineOptions={machineOptions}
        userOptions={userOptions}
      />

      {/* ── Desktop table ───────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-3 py-2"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:text-stone-800 dark:hover:text-stone-200"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <SortIcon
                              isSorted={header.column.getIsSorted()}
                            />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2">Actions</th>
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedShot(row.original)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50",
                      row.original.isReferenceShot
                        ? "border-l-4 border-l-amber-400 bg-amber-50/40 dark:bg-amber-900/10"
                        : "bg-white dark:bg-stone-900"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="whitespace-nowrap px-3 py-2 text-stone-700 dark:text-stone-300"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                    <td
                      className="whitespace-nowrap px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleReference(row.original.id)}
                          className={cn(
                            "text-lg transition-transform hover:scale-110",
                            row.original.isReferenceShot
                              ? "text-amber-500"
                              : "text-stone-300 hover:text-amber-400 dark:text-stone-600"
                          )}
                          title={row.original.isReferenceShot ? "Remove reference" : "Mark reference"}
                        >
                          {row.original.isReferenceShot ? "⭐" : "☆"}
                        </button>
                        <button
                          onClick={() => handleToggleHidden(row.original.id)}
                          className={cn(
                            "transition-transform hover:scale-110",
                            row.original.isHidden
                              ? "text-stone-500"
                              : "text-stone-300 hover:text-stone-500 dark:text-stone-600"
                          )}
                          title={row.original.isHidden ? "Show shot" : "Hide shot"}
                        >
                          {row.original.isHidden ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDuplicate(row.original)}
                          className="text-stone-300 transition-transform hover:scale-110 hover:text-stone-500 dark:text-stone-600"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShare(row.original)}
                          className="text-stone-300 transition-transform hover:scale-110 hover:text-stone-500 dark:text-stone-600"
                          title="Share"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-3 py-8 text-center text-stone-400 dark:text-stone-500"
                  >
                    No matching shots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <PaginationButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronDoubleRightIcon className="h-4 w-4" />
            </PaginationButton>
          </div>
        </div>
      </div>

      {/* ── Mobile cards ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredRows.length > 0 ? (
          filteredRows.map((row) => (
            <ShotCard
              key={row.id}
              shot={row.original}
              tempUnit={tempUnit}
              onToggleReference={handleToggleReference}
              onToggleHidden={handleToggleHidden}
              onClick={setSelectedShot}
              onDuplicate={handleDuplicate}
              onSelect={handleSelect}
              isSelected={selectedIds.has(row.original.id)}
              isSelecting={isSelecting}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
            No matching shots.
          </p>
        )}
      </div>

      {/* ── Shot detail modal ──────────────────────────────────────── */}
      <ShotDetail
        shot={selectedShot}
        open={!!selectedShot}
        onClose={() => setSelectedShot(null)}
        onDelete={handleDelete}
        onToggleReference={handleToggleReference}
        onToggleHidden={handleToggleHidden}
        shots={filteredShots}
        currentIndex={
          selectedShot
            ? filteredShots.findIndex((s) => s.id === selectedShot.id)
            : undefined
        }
        onShotChange={setSelectedShot}
      />
    </div>
  );
}

// ── Small helper ───────────────────────────────────────────────────

function PaginationButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-stone-200 p-1.5 text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
    >
      {children}
    </button>
  );
}
