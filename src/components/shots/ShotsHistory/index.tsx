"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import type { ShotWithJoins } from "@/components/shots/hooks";
import type { BeanShotWithUser } from "@/components/beans/hooks";
import { cn } from "@/lib/utils";
import { SortIcon } from "@/components/ui/filter-bar";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusCircleIcon,
  ShareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ShotsHistoryShotCard } from "./shot-card";

export {
  useShotsTable,
  buildShotFilterDescriptors,
  buildShotsTableColumns,
  withUserFilterDescriptorPlacement,
} from "./table-state";

export {
  useShotsHistoryController,
  type ShotsHistoryController,
} from "./use-controller";

export function beanShotToShotsWithJoin(
  bean: {
    id: string;
    name: string;
    roastDate?: Date | string | null;
    roastLevel?: string | null;
  },
  shot: BeanShotWithUser,
): ShotWithJoins {
  const sq =
    shot.shotQuality != null && shot.shotQuality !== ""
      ? parseFloat(String(shot.shotQuality))
      : 0;
  const rating =
    shot.rating != null && shot.rating !== ""
      ? parseFloat(String(shot.rating))
      : null;

  const roast =
    bean.roastDate != null && bean.roastDate !== ""
      ? typeof bean.roastDate === "string"
        ? bean.roastDate
        : bean.roastDate.toISOString()
      : null;

  return {
    id: shot.id,
    userId: shot.userId,
    userName: shot.userName,
    beanId: bean.id,
    beanName: bean.name,
    beanRoastDate: roast,
    beanRoastLevel: bean.roastLevel ?? null,
    grinderId: "",
    grinderName: null,
    machineId: null,
    machineName: null,
    doseGrams: shot.doseGrams ?? "",
    yieldGrams: shot.yieldGrams ?? "",
    sizeOz: null,
    yieldActualGrams: null,
    grindLevel: shot.grindLevel ?? "",
    brewTimeSecs: shot.brewTimeSecs,
    brewTempC: shot.brewTempC,
    preInfusionDuration: shot.preInfusionDuration,
    preInfusionWaitDuration: shot.preInfusionWaitDuration,
    brewPressure: shot.brewPressure,
    flowRate: shot.flowRate,
    brewRatio: shot.brewRatio,
    estimateMaxPressure: null,
    flowControl: null,
    daysPostRoast: shot.daysPostRoast,
    shotQuality: Number.isFinite(sq) ? sq : 0,
    rating: rating != null && Number.isFinite(rating) ? rating : null,
    bitter:
      shot.bitter != null && shot.bitter !== ""
        ? parseFloat(String(shot.bitter))
        : null,
    sour:
      shot.sour != null && shot.sour !== ""
        ? parseFloat(String(shot.sour))
        : null,
    toolsUsed: null,
    notes: shot.notes,
    flavors: shot.flavors,
    bodyTexture: shot.bodyTexture,
    adjectives: shot.adjectives,
    isReferenceShot: shot.isReferenceShot,
    isHidden: shot.isHidden,
    createdAt: shot.createdAt,
    updatedAt: shot.createdAt,
  };
}

export function ShotsSelectionBar({
  selectedIds,
  onDeselectAll,
  onRequestDelete,
  onBulkReference,
  onBulkHide,
}: {
  selectedIds: Set<string>;
  onDeselectAll: () => void;
  onRequestDelete: () => void;
  onBulkReference: () => void;
  onBulkHide: () => void;
}) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
        {selectedIds.size} {selectedIds.size === 1 ? "shot" : "shots"} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onRequestDelete}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onBulkReference}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
        >
          Reference
        </button>
        <button
          type="button"
          onClick={onBulkHide}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700"
        >
          Hide
        </button>
        <button
          type="button"
          onClick={onDeselectAll}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function ShotsDownloadMenu({
  rowCount,
  onExportCsv,
  onCopyForAi,
}: {
  rowCount: number;
  onExportCsv: () => void;
  onCopyForAi: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {rowCount} shot{rowCount !== 1 ? "s" : ""}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem
          onClick={onExportCsv}
          className="flex items-center gap-3 px-4 py-3 text-base"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onCopyForAi}
          className="flex items-center gap-3 px-4 py-3 text-base"
        >
          <SparklesIcon className="h-5 w-5" />
          Copy for AI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

export interface ShotsHistoryTableProps {
  table: Table<ShotWithJoins>;
  isLoading?: boolean;
  /** Show the Actions column. Defaults to true. */
  editable?: boolean;
  /** Per-row authorization. Only consulted when `editable` is true. */
  canMutateShot?: (shot: ShotWithJoins) => boolean;
  onRowOpen: (shot: ShotWithJoins) => void;
  tempUnit: "C" | "F";
  selectedIds: Set<string>;
  onToggleSelect: (shot: ShotWithJoins) => void;
  isSelecting: boolean;
  onToggleReference: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDuplicate: (shot: ShotWithJoins) => void;
  onEdit: (shot: ShotWithJoins) => void;
  onShare: (shot: ShotWithJoins) => void | Promise<void>;
}

export function ShotsHistoryTable({
  table,
  isLoading = false,
  editable = true,
  canMutateShot,
  onRowOpen,
  tempUnit,
  selectedIds,
  onToggleSelect,
  isSelecting,
  onToggleReference,
  onToggleHidden,
  onDuplicate,
  onEdit,
  onShare,
}: ShotsHistoryTableProps) {
  function canMutate(shot: ShotWithJoins) {
    if (!editable) return false;
    if (canMutateShot) return canMutateShot(shot);
    return true;
  }

  const filteredRows = table.getFilteredRowModel().rows;
  const visibleColCount = table.getVisibleLeafColumns().length + (editable ? 1 : 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <div className="h-40 animate-pulse bg-stone-100 dark:bg-stone-800" />
          </div>
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
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
                  {editable && (
                    <th className="whitespace-nowrap px-3 py-2">Actions</th>
                  )}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => {
                  const shot = row.original;
                  const allow = canMutate(shot);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowOpen(shot)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50",
                        shot.isReferenceShot
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
                      {editable && (
                        <td
                          className="whitespace-nowrap px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allow ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleReference(shot.id)}
                                className={cn(
                                  "text-lg transition-transform hover:scale-110",
                                  shot.isReferenceShot
                                    ? "text-amber-500"
                                    : "text-stone-300 hover:text-amber-400 dark:text-stone-600",
                                )}
                                title={
                                  shot.isReferenceShot
                                    ? "Remove reference"
                                    : "Mark reference"
                                }
                              >
                                {shot.isReferenceShot ? "🔖" : "📑"}
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleHidden(shot.id)}
                                className={cn(
                                  "transition-transform hover:scale-110",
                                  shot.isHidden
                                    ? "text-stone-500"
                                    : "text-stone-300 hover:text-stone-500 dark:text-stone-600",
                                )}
                                title={
                                  shot.isHidden ? "Show shot" : "Hide shot"
                                }
                              >
                                {shot.isHidden ? (
                                  <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicate(shot)}
                                className="text-stone-300 transition-transform hover:scale-110 hover:text-stone-500 dark:text-stone-600"
                                title="Duplicate"
                              >
                                <PlusCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onShare(shot)}
                                className="text-stone-300 transition-transform hover:scale-110 hover:text-stone-500 dark:text-stone-600"
                                title="Share"
                              >
                                <ShareIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 dark:text-stone-500">
                              —
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-8 text-center text-stone-400 dark:text-stone-500"
                  >
                    No matching shots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      <div className="flex flex-col gap-3 md:hidden">
        {filteredRows.length > 0 ? (
          filteredRows.map((row) => {
            const shot = row.original;
            const allow = canMutate(shot);
            return (
              <ShotsHistoryShotCard
                key={row.id}
                shot={shot}
                tempUnit={tempUnit}
                onToggleReference={allow ? onToggleReference : undefined}
                onToggleHidden={allow ? onToggleHidden : undefined}
                onClick={onRowOpen}
                onEdit={allow ? onEdit : undefined}
                onDuplicate={allow ? onDuplicate : undefined}
                onSelect={allow ? onToggleSelect : undefined}
                isSelected={selectedIds.has(shot.id)}
                isSelecting={isSelecting}
              />
            );
          })
        ) : (
          <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
            No matching shots.
          </p>
        )}
      </div>
    </>
  );
}
