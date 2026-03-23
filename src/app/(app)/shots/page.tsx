"use client";

import { useState, useMemo, useRef, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
} from "@tanstack/react-table";
import {
  useShots,
  useDeleteShot,
  useToggleReference,
  useToggleHidden,
  useCreateShareLink,
  type ShotWithJoins,
} from "@/components/shots/hooks";
import { ShotLimitBanner } from "@/components/billing/ShotLimitBanner";
import { ShotDetail } from "@/components/shots/ShotDetail";
import {
  ActionButtonBar,
} from "@/components/shots/ActionButtonBar";
import { useShotActions } from "@/components/shots/useShotActions";
import { useToast } from "@/components/common/Toast";
import { AppRoutes, ApiRoutes, resolvePath } from "@/app/routes";
import { buildShareText, type ShotShareData } from "@/lib/share-text";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusCircleIcon,
  ShareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkIconSolid,
} from "@heroicons/react/24/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { exportToCsv, type CSVColumn } from "@/lib/export-csv";
import { buildAiExportPrompt } from "@/lib/export-ai-prompt";
import { useTempUnit } from "@/lib/use-temp-unit";
import { FilterBar, SortIcon, type FilterDescriptor } from "@/components/ui/filter-bar";

// ── Filter function helpers ────────────────────────────────────────

/** Multi-select: row matches if its value is in the selected set. */
function multiSelectFilterFn(
  rowValue: string | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.includes(rowValue);
}

/** Numeric bucket: row matches if its rounded value is in the selected set. */
function numericBucketFilterFn(
  rowValue: number | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.some((v) => Math.round(rowValue) === Number(v));
}

/** Date range: row matches if its date is within [from, to]. */
function dateRangeFilterFn(
  rowValue: string,
  filterValue: [string, string], // [from, to] as ISO date strings
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
function booleanFilterFn(rowValue: boolean, filterValues: string[]): boolean {
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
    cell: (info) => (info.getValue() ? "🔖" : ""),
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
  onEdit?: (shot: ShotWithJoins) => void;
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
  onEdit,
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

  // ── Long-press share setup ──────────────────────────────────────
  const createShareLink = useCreateShareLink();
  const shotIdRef = useRef(shot.id);
  useEffect(() => { shotIdRef.current = shot.id; }, [shot.id]);

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
    [shot],
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
    [],
  );

  const shotActions = useShotActions({
    shot,
    tempUnit,
    shotShareData,
    getShareUrl,
    onShare: handleShareAction,
    onEdit: onEdit ? () => onEdit(shot) : onClick ? () => onClick(shot) : undefined,
    onToggleReference: onToggleReference ? () => onToggleReference(shot.id) : undefined,
    onToggleHidden: onToggleHidden ? () => onToggleHidden(shot.id) : undefined,
    onDuplicate: onDuplicate ? () => onDuplicate(shot) : undefined,
    showEdit: true,
  });

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
          ? "border-amber-700 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-900/10"
          : "border-stone-200 dark:border-stone-700",
        isSelected
          ? " border-amber-700 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-900/20"
          : "",
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
          {isRef && <BookmarkIconSolid className="h-4 w-4 text-amber-500" />}
        </div>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Dose", value: shot.doseGrams ? `${shot.doseGrams}g` : "—" },
          {
            label: "Yield",
            value: shot.yieldGrams ? `${shot.yieldGrams}g` : "—",
          },
          { label: "Ratio", value: ratio },
          {
            label: "Time",
            value: shot.brewTimeSecs ? `${shot.brewTimeSecs}s` : "—",
          },
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
      {(onToggleReference || onToggleHidden || onDuplicate || onEdit || onSelect) && (
        <div
          className="mt-3 flex h-10 w-full items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {!isSelecting ? (
            <div className="flex-[0.9]">
              <ActionButtonBar actions={shotActions} />
            </div>
          ) : (
            <div className="flex-[0.9]">
              <>
                {onEdit && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                {onToggleReference && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                {onToggleHidden && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                {onDuplicate && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                <div className="h-10 flex-1" aria-hidden="true" />
              </>
            </div>
          )}
          {onSelect && (
            <div className="flex-[0.1] flex justify-end">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Table hook (isolated so useReactTable's unstable API doesn't block memoization of ShotsPage) ──

function useShotsTable({
  data,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  globalFilter,
  setGlobalFilter,
}: {
  data: ShotWithJoins[];
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
  globalFilter: string;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
}) {
  "use no memo";
  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    autoResetPageIndex: false,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase().trim();
      if (!q) return true;
      const s = row.original;
      return [
        s.beanName,
        s.grinderName,
        s.machineName,
        s.userName,
        s.notes,
      ].some((f) => f != null && f.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.id,
  });
}

// ── Page ───────────────────────────────────────────────────────────

export default function ShotsPage() {
  const router = useRouter();
  const { data: shots, isLoading } = useShots();
  const deleteShot = useDeleteShot();

  const { data: shotCountData } = useQuery<{ total: number; limit: number | null }>({
    queryKey: ["shots", "count"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.shots.count.path);
      if (!res.ok) throw new Error("Failed to fetch shot count");
      return res.json();
    },
  });
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
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const isSelecting = selectedIds.size > 0;
  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);

  const data = useMemo(() => shots ?? [], [shots]);

  // ── Action handlers ───────────────────────────────────────────────

  const handleToggleReference = useCallback(
    (id: string) => {
      toggleReference.mutate(id, {
        onSuccess: (updatedShot) => {
          if (selectedShot?.id === id) {
            setSelectedShot((prev) =>
              prev
                ? { ...prev, isReferenceShot: updatedShot.isReferenceShot }
                : null,
            );
          }
        },
      });
    },
    [toggleReference, selectedShot?.id],
  );

  const handleToggleHidden = useCallback(
    (id: string) => {
      toggleHidden.mutate(id, {
        onSuccess: (updatedShot) => {
          if (selectedShot?.id === id) {
            setSelectedShot((prev) =>
              prev ? { ...prev, isHidden: updatedShot.isHidden } : null,
            );
          }
        },
      });
    },
    [toggleHidden, selectedShot?.id],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteShot.mutate(id);
      if (selectedShot?.id === id) setSelectedShot(null);
    },
    [deleteShot, selectedShot?.id],
  );

  const handleEdit = useCallback((shot: ShotWithJoins) => {
    setSelectedShot(shot);
    setOpenInEditMode(true);
  }, []);

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
      if (shot.preInfusionDuration)
        params.set("preInfusionDuration", shot.preInfusionDuration);
      if (shot.brewPressure) params.set("brewPressure", shot.brewPressure);
      if (shot.toolsUsed && shot.toolsUsed.length > 0) {
        params.set("toolsUsed", shot.toolsUsed.join(","));
      }
      router.push(`${AppRoutes.log.path}?${params.toString()}`);
    },
    [router],
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
                yieldActualGrams: shot.yieldActualGrams
                  ? parseFloat(shot.yieldActualGrams)
                  : null,
                brewTimeSecs: shot.brewTimeSecs
                  ? parseFloat(shot.brewTimeSecs)
                  : null,
                grindLevel: shot.grindLevel
                  ? parseFloat(shot.grindLevel)
                  : null,
                brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : null,
                brewPressure: shot.brewPressure
                  ? parseFloat(shot.brewPressure)
                  : null,
                grinderName: shot.grinderName,
                machineName: shot.machineName,
                flavors: shot.flavors,
                bodyTexture: shot.bodyTexture,
                adjectives: shot.adjectives,
                notes: shot.notes,
                url: shareUrl,
              },
              tempUnit,
            );

            const shareDataObj = {
              title: "Journey before Destination!",
              text: shareText,
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
    [createShareLink, showToast, tempUnit],
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
  }, []);

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      for (const id of ids) deleteShot.mutate(id);
    },
    [deleteShot],
  );

  const handleBulkToggleReference = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => toggleReference.mutate(id));
    },
    [toggleReference],
  );

  const handleBulkSetHidden = useCallback(
    (ids: string[], hidden: boolean) => {
      if (!shots) return;
      const selected = shots.filter((s) => ids.includes(s.id));
      const toToggle = selected.filter((s) => s.isHidden !== hidden);
      for (const s of toToggle) toggleHidden.mutate(s.id);
    },
    [shots, toggleHidden],
  );

  const table = useShotsTable({
    data,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
  });

  const filteredRows = table.getFilteredRowModel().rows;

  // Handle CSV export
  const handleExport = useCallback(() => {
    const filteredRows = table
      .getFilteredRowModel()
      .rows.map((row) => row.original);

    const columns: CSVColumn<ShotWithJoins>[] = [
      {
        id: "date",
        header: "Date",
        accessorFn: (row) => new Date(row.createdAt).toLocaleString(),
      },
      { id: "bean", header: "Bean", accessorFn: (row) => row.beanName ?? "" },
      {
        id: "dose",
        header: "Dose (g)",
        accessorFn: (row) => row.doseGrams ?? "",
      },
      {
        id: "yield",
        header: "Yield (g)",
        accessorFn: (row) => row.yieldGrams ?? "",
      },
      {
        id: "ratio",
        header: "Ratio",
        accessorFn: (row) =>
          row.brewRatio != null ? `1:${row.brewRatio}` : "",
      },
      {
        id: "time",
        header: "Time (s)",
        accessorFn: (row) => row.brewTimeSecs ?? "",
      },
      {
        id: "grind",
        header: "Grind",
        accessorFn: (row) => row.grindLevel ?? "",
      },
      {
        id: "grinder",
        header: "Grinder",
        accessorFn: (row) => row.grinderName ?? "",
      },
      {
        id: "machine",
        header: "Machine",
        accessorFn: (row) => row.machineName ?? "",
      },
      {
        id: "quality",
        header: "Quality",
        accessorFn: (row) => row.shotQuality ?? "",
      },
      { id: "rating", header: "Rating", accessorFn: (row) => row.rating ?? "" },
      {
        id: "ref",
        header: "Reference",
        accessorFn: (row) => (row.isReferenceShot ? "Yes" : "No"),
      },
      { id: "user", header: "User", accessorFn: (row) => row.userName ?? "" },
    ];

    const filename = `coffee-shots-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCsv(filename, filteredRows, columns);
  }, [table]);

  // Handle "Copy for AI" – copy prompt to clipboard
  const handleCopyForAi = useCallback(async () => {
    const rows = table.getFilteredRowModel().rows.map((row) => row.original);
    const content = buildAiExportPrompt(rows);
    try {
      await navigator.clipboard.writeText(content);
      showToast("success", "Copied to clipboard. Paste into your AI assistant.");
    } catch {
      showToast("error", "Failed to copy to clipboard.");
    }
  }, [table, showToast]);

  // Extract filtered shots array for navigation
  const filteredShots = useMemo(
    () => filteredRows.map((row) => row.original),
    [filteredRows],
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

  const shotFilterDescriptors = useMemo((): FilterDescriptor[] => {
    const ratingOptions = [1, 2, 3, 4, 5].map((n) => ({
      label: `${n}`,
      value: `${n}`,
    }));
    const qualityOptions = ratingOptions;
    const refOptions = [
      { label: "Reference", value: "true" },
      { label: "Not reference", value: "false" },
    ];
    return [
      { columnId: "date" },
      { columnId: "bean", options: beanOptions },
      { columnId: "grinder", options: grinderOptions },
      { columnId: "machine", options: machineOptions },
      { columnId: "quality", options: qualityOptions },
      { columnId: "rating", options: ratingOptions },
      { columnId: "ref", options: refOptions },
      { columnId: "user", options: userOptions },
    ];
  }, [beanOptions, grinderOptions, machineOptions, userOptions]);

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
        <Link
          href={AppRoutes.log.path}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 hover:bg-amber-800 bg-amber-700"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Add a shot
        </Link>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Shot limit banner for free-tier users */}
      {shotCountData?.limit != null && (
        <ShotLimitBanner
          totalCount={shotCountData.total}
          limit={shotCountData.limit}
        />
      )}

      {/* Sticky header area on mobile */}
      <div className="sticky top-0 z-10 space-y-4 bg-white pb-4 dark:bg-stone-950 sm:static sm:bg-transparent dark:sm:bg-transparent sm:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between pt-4 sm:pt-0">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            Shots
          </h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {filteredRows.length} shot
                  {filteredRows.length !== 1 ? "s" : ""}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem
                  onClick={handleExport}
                  className="flex items-center gap-3 px-4 py-3 text-base"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyForAi}
                  className="flex items-center gap-3 px-4 py-3 text-base"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Copy for AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={AppRoutes.log.path}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-700"
              title="Log a shot"
            >
              <PlusCircleIcon className="h-5 w-5" />
              Log shot
            </Link>
          </div>
        </div>

        {/* Selection bar */}
        {isSelecting && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {selectedIds.size} {selectedIds.size === 1 ? "shot" : "shots"}{" "}
              selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => setBulkDeleteIds(Array.from(selectedIds))}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() =>
                      handleBulkToggleReference(Array.from(selectedIds))
                    }
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
        <FilterBar table={table} filters={shotFilterDescriptors} />
      </div>

      {/* ── Desktop table ───────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap px-3 py-2">
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
                            header.getContext(),
                          )}
                          {header.column.getCanSort() && (
                            <SortIcon isSorted={header.column.getIsSorted()} />
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
                        : "bg-white dark:bg-stone-900",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="whitespace-nowrap px-3 py-2 text-stone-700 dark:text-stone-300"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
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
                              : "text-stone-300 hover:text-amber-400 dark:text-stone-600",
                          )}
                          title={
                            row.original.isReferenceShot
                              ? "Remove reference"
                              : "Mark reference"
                          }
                        >
                          {row.original.isReferenceShot ? "🔖" : "📑"}
                        </button>
                        <button
                          onClick={() => handleToggleHidden(row.original.id)}
                          className={cn(
                            "transition-transform hover:scale-110",
                            row.original.isHidden
                              ? "text-stone-500"
                              : "text-stone-300 hover:text-stone-500 dark:text-stone-600",
                          )}
                          title={
                            row.original.isHidden ? "Show shot" : "Hide shot"
                          }
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
                          <PlusCircleIcon className="h-4 w-4" />
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
              onEdit={handleEdit}
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
        onClose={() => {
          setSelectedShot(null);
          setOpenInEditMode(false);
        }}
        onDelete={handleDelete}
        onToggleReference={handleToggleReference}
        onToggleHidden={handleToggleHidden}
        shots={filteredShots}
        currentIndex={
          selectedShot
            ? filteredShots.findIndex((s) => s.id === selectedShot.id)
            : undefined
        }
        onShotChange={(shot) => {
          setSelectedShot(shot);
          setOpenInEditMode(false);
        }}
        initialEditMode={openInEditMode}
      />
      <ConfirmDialog
        open={bulkDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteIds(null);
        }}
        title="Delete shots?"
        description={
          bulkDeleteIds?.length
            ? bulkDeleteIds.length === 1
              ? "Delete this shot? This cannot be undone."
              : `Delete ${bulkDeleteIds.length} shots? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (!bulkDeleteIds?.length) return;
          handleBulkDelete(bulkDeleteIds);
          setSelectedIds(new Set());
          showToast(
            "success",
            bulkDeleteIds.length === 1
              ? "Shot deleted."
              : `Deleted ${bulkDeleteIds.length} shots.`,
          );
          setBulkDeleteIds(null);
        }}
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
