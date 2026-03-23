"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  ShotsDownloadMenu,
  type ShotsHistoryController,
} from "@/components/shots/ShotsHistory";

interface BeanShotsSelectorsProps {
  ctrl: ShotsHistoryController;
  contributorCount: number;
  filteredRowCount: number;
  onExportCsv: () => void;
  onCopyForAi: () => void;
}

export function BeanShotsSelectors({
  ctrl,
  contributorCount,
  filteredRowCount,
  onExportCsv,
  onCopyForAi,
}: BeanShotsSelectorsProps) {
  const hasMultipleContributors = contributorCount > 1;

  return (
    <div className="space-y-3">
      <div
        className={
          hasMultipleContributors
            ? "flex flex-wrap items-center gap-3"
            : "flex flex-wrap items-center justify-end gap-3"
        }
      >
        {hasMultipleContributors && (
          <span className="mr-auto text-xs text-stone-400">
            {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}
          </span>
        )}
        <ShotsDownloadMenu
          rowCount={filteredRowCount}
          onExportCsv={onExportCsv}
          onCopyForAi={onCopyForAi}
        />
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search grinders, machines, notes…"
          value={ctrl.globalFilter}
          onChange={(e) => ctrl.setGlobalFilter(e.target.value)}
          className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-500"
        />
        {ctrl.globalFilter && (
          <button
            type="button"
            onClick={() => ctrl.setGlobalFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            Clear
          </button>
        )}
      </div>

      <FilterBar table={ctrl.table} filters={ctrl.shotFilterDescriptors} />
    </div>
  );
}
