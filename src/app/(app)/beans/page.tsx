"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useBeansList, type BeanWithCounts } from "@/components/beans/hooks";
import { AppRoutes, resolvePath } from "@/app/routes";
import { cn } from "@/lib/utils";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { BeanIcon } from "@/components/common/BeanIcon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { exportToCsv, type CSVColumn } from "@/lib/export-csv";

// ── Filter helpers ─────────────────────────────────────────────────

function multiSelectFilterFn(
  rowValue: string | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.includes(rowValue);
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Column definitions ─────────────────────────────────────────────

const columnHelper = createColumnHelper<BeanWithCounts>();

const columns = [
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("roaster", {
    id: "roaster",
    header: "Roaster",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.roaster, value as string[]),
  }),
  columnHelper.accessor("origin", {
    id: "origin",
    header: "Origin",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.origin, value as string[]),
  }),
  columnHelper.accessor("roastLevel", {
    id: "roastLevel",
    header: "Roast",
    cell: (info) => info.getValue(),
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.roastLevel, value as string[]),
  }),
  columnHelper.accessor("processingMethod", {
    id: "processingMethod",
    header: "Process",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.processingMethod, value as string[]),
  }),
  columnHelper.accessor("roastDate", {
    id: "roastDate",
    header: "Roast Date",
    cell: (info) => formatDate(info.getValue()),
    sortingFn: (a, b) => {
      const aDate = a.original.roastDate ? new Date(a.original.roastDate).getTime() : 0;
      const bDate = b.original.roastDate ? new Date(b.original.roastDate).getTime() : 0;
      return aDate - bDate;
    },
  }),
  columnHelper.accessor("shotCount", {
    id: "shotCount",
    header: "Shots",
    cell: (info) => info.getValue(),
    enableColumnFilter: false,
  }),
  columnHelper.accessor("avgRating", {
    id: "avgRating",
    header: "Avg Rating",
    cell: (info) => {
      const val = info.getValue();
      return val != null ? `★ ${val.toFixed(1)}` : "—";
    },
    sortingFn: (a, b) => {
      const aVal = a.original.avgRating ?? 0;
      const bVal = b.original.avgRating ?? 0;
      return aVal - bVal;
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("bestRating", {
    id: "bestRating",
    header: "Best Rating",
    cell: (info) => {
      const val = info.getValue();
      return val != null ? `★ ${val.toFixed(1)}` : "—";
    },
    sortingFn: (a, b) => {
      const aVal = a.original.bestRating ?? 0;
      const bVal = b.original.bestRating ?? 0;
      return aVal - bVal;
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("lastShotAt", {
    id: "lastShotAt",
    header: "Last Shot",
    cell: (info) => formatDate(info.getValue()),
    sortingFn: (a, b) => {
      const aDate = a.original.lastShotAt ? new Date(a.original.lastShotAt).getTime() : 0;
      const bDate = b.original.lastShotAt ? new Date(b.original.lastShotAt).getTime() : 0;
      return aDate - bDate;
    },
    enableColumnFilter: false,
  }),
];

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

// ── Mobile sort bar ────────────────────────────────────────────────

const SORT_OPTIONS = [
  { label: "Name", id: "name" },
  { label: "Roaster", id: "roaster" },
  { label: "Roast Date", id: "roastDate" },
  { label: "Shots", id: "shotCount" },
  { label: "Best Rating", id: "bestRating" },
  { label: "Last Shot", id: "lastShotAt" },
];

function MobileSortBar({
  sorting,
  onSortChange,
}: {
  sorting: SortingState;
  onSortChange: (s: SortingState) => void;
}) {
  const active = sorting[0];

  function toggle(id: string) {
    if (active?.id === id) {
      onSortChange([{ id, desc: !active.desc }]);
    } else {
      onSortChange([{ id, desc: false }]);
    }
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      <ArrowsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      {SORT_OPTIONS.map((opt) => {
        const isActive = active?.id === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800",
            )}
          >
            {opt.label}
            {isActive && (
              active.desc
                ? <ChevronDownIcon className="h-3 w-3" />
                : <ChevronUpIcon className="h-3 w-3" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Bean card (mobile) ─────────────────────────────────────────────

interface BeanCardProps {
  bean: BeanWithCounts;
  onClick: (bean: BeanWithCounts) => void;
  onSelect?: (bean: BeanWithCounts) => void;
  isSelected?: boolean;
  isSelecting?: boolean;
}

function BeanCard({ bean, onClick, onSelect, isSelected, isSelecting }: BeanCardProps) {
  const muted = bean.allShotsHidden;

  return (
    <div
      onClick={() => {
        if (isSelecting && onSelect) {
          onSelect(bean);
        } else {
          onClick(bean);
        }
      }}
      className={cn(
        "relative rounded-xl border bg-white p-4 transition-colors dark:bg-stone-900",
        "cursor-pointer active:bg-stone-50 dark:active:bg-stone-800",
        isSelected
          ? "border-amber-400 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-900/20"
          : "border-stone-200 dark:border-stone-700",
        muted && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn(
            "truncate font-medium",
            muted
              ? "text-stone-400 dark:text-stone-600"
              : "text-stone-800 dark:text-stone-200",
          )}>
            {bean.name}
          </p>
          {bean.roaster && (
            <p className="truncate text-xs text-stone-400 dark:text-stone-500">
              {bean.roaster}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {bean.roastLevel}
          </span>
          {bean.bestRating != null && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              ★ {bean.bestRating.toFixed(1)}
            </span>
          )}
          {bean.avgRating != null && bean.bestRating == null && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              ★ {bean.avgRating.toFixed(1)} avg
            </span>
          )}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(bean);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
            />
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Origin", value: bean.origin ?? "—" },
          { label: "Process", value: bean.processingMethod ?? "—" },
          { label: "Roast Date", value: formatDate(bean.roastDate) },
          { label: "Shots", value: String(bean.shotCount) },
          { label: "Last Shot", value: formatDate(bean.lastShotAt) },
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
      {bean.commonFlavors && bean.commonFlavors.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {bean.commonFlavors.map((flavor) => (
            <span
              key={flavor}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              {flavor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pagination button ──────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────

export default function BeansPage() {
  const router = useRouter();
  const { data: beans, isLoading } = useBeansList();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastShotAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const data = useMemo(() => beans ?? [], [beans]);

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
      const b = row.original;
      return [b.name, b.roaster, b.origin, b.originDetails].some(
        (f) => f != null && f.toLowerCase().includes(q),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const filteredRows = table.getFilteredRowModel().rows;

  const handleBeanClick = useCallback(
    (bean: BeanWithCounts) => {
      router.push(resolvePath(AppRoutes.beans.beanId, { id: bean.id }));
    },
    [router],
  );

  const handleSelect = useCallback((bean: BeanWithCounts) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bean.id)) {
        next.delete(bean.id);
      } else {
        next.add(bean.id);
      }
      return next;
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  const handleCompare = useCallback(() => {
    const ids = Array.from(selectedIds).join(",");
    router.push(`${AppRoutes.beans.compare.path}?ids=${ids}`);
  }, [router, selectedIds]);

  // Handle CSV export
  const handleExport = useCallback(() => {
    const filteredRows = table
      .getFilteredRowModel()
      .rows.map((row) => row.original);

    const columns: CSVColumn<BeanWithCounts>[] = [
      { id: "name", header: "Name", accessorFn: (row) => row.name },
      { id: "roaster", header: "Roaster", accessorFn: (row) => row.roaster ?? "" },
      { id: "origin", header: "Origin", accessorFn: (row) => row.origin ?? "" },
      { id: "roastLevel", header: "Roast Level", accessorFn: (row) => row.roastLevel },
      {
        id: "processingMethod",
        header: "Processing Method",
        accessorFn: (row) => row.processingMethod ?? "",
      },
      {
        id: "roastDate",
        header: "Roast Date",
        accessorFn: (row) =>
          row.roastDate ? new Date(row.roastDate).toLocaleDateString() : "",
      },
      {
        id: "shotCount",
        header: "Shot Count",
        accessorFn: (row) => row.shotCount,
      },
      {
        id: "avgRating",
        header: "Avg Rating",
        accessorFn: (row) => (row.avgRating != null ? row.avgRating.toFixed(1) : ""),
      },
      {
        id: "bestRating",
        header: "Best Rating",
        accessorFn: (row) => (row.bestRating != null ? row.bestRating.toFixed(1) : ""),
      },
      {
        id: "lastShotAt",
        header: "Last Shot",
        accessorFn: (row) =>
          row.lastShotAt ? new Date(row.lastShotAt).toLocaleDateString() : "",
      },
    ];

    const filename = `coffee-beans-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCsv(filename, filteredRows, columns);
  }, [table]);

  // Auto-toggle selection mode
  useEffect(() => {
    if (selectedIds.size > 0 && !isSelecting) {
      setIsSelecting(true);
    } else if (selectedIds.size === 0 && isSelecting) {
      setIsSelecting(false);
    }
  }, [selectedIds.size, isSelecting]);

  // ── Loading ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Beans
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

  // ── Empty ────────────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BeanIcon className="h-10 w-10 text-stone-300 dark:text-stone-600" />
        <h3 className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-300">
          No beans yet
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Add a bean when logging your first shot.
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 space-y-3 bg-white pb-2 dark:bg-stone-950 sm:static sm:bg-transparent dark:sm:bg-transparent sm:pb-0">
        {/* Title + export */}
        <div className="flex items-center justify-between pt-4 sm:pt-0">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            Beans
          </h1>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {filteredRows.length} bean
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection bar */}
        {isSelecting && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {selectedIds.size} {selectedIds.size === 1 ? "bean" : "beans"} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size >= 2 && (
                <button
                  onClick={handleCompare}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  Compare
                </button>
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
            placeholder="Search beans, roasters, origins…"
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

        {/* Mobile sort bar */}
        <div className="md:hidden">
          <MobileSortBar sorting={sorting} onSortChange={setSorting} />
        </div>
      </div>

      {/* ── Desktop table ──────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <th className="whitespace-nowrap px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                      onChange={() => {
                        if (selectedIds.size === filteredRows.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filteredRows.map((r) => r.id)));
                        }
                      }}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                    />
                  </th>
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
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const bean = row.original;
                  const muted = bean.allShotsHidden;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleBeanClick(bean)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50",
                        selectedIds.has(bean.id)
                          ? "bg-amber-50/40 dark:bg-amber-900/10"
                          : "bg-white dark:bg-stone-900",
                        muted && "opacity-50",
                      )}
                    >
                      <td
                        className="whitespace-nowrap px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(bean.id)}
                          onChange={() => handleSelect(bean)}
                          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                        />
                      </td>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "whitespace-nowrap px-3 py-2",
                            muted
                              ? "text-stone-400 dark:text-stone-600"
                              : "text-stone-700 dark:text-stone-300",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-3 py-8 text-center text-stone-400 dark:text-stone-500"
                  >
                    No matching beans.
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

      {/* ── Mobile cards ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredRows.length > 0 ? (
          filteredRows.map((row) => (
            <BeanCard
              key={row.id}
              bean={row.original}
              onClick={handleBeanClick}
              onSelect={handleSelect}
              isSelected={selectedIds.has(row.original.id)}
              isSelecting={isSelecting}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
            No matching beans.
          </p>
        )}
      </div>
    </div>
  );
}
