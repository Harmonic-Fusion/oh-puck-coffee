"use client";

import type { Table } from "@tanstack/react-table";
import { ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { BeanWithCounts } from "@/components/beans/hooks";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FilterBar, type FilterDescriptor } from "@/components/ui/filter-bar";

export function BeansListToolbar({
  filteredRowCount,
  onExport,
  onOpenCreate,
  isSelecting,
  selectedCount,
  onCompare,
  onDeselectAll,
  canCompare,
  globalFilter,
  onGlobalFilterChange,
  table,
  filterDescriptors,
}: {
  filteredRowCount: number;
  onExport: () => void;
  onOpenCreate: () => void;
  isSelecting: boolean;
  selectedCount: number;
  onCompare: () => void;
  onDeselectAll: () => void;
  canCompare: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  table: Table<BeanWithCounts>;
  filterDescriptors: FilterDescriptor[];
}) {
  return (
    <div className="sticky top-0 z-10 space-y-3 bg-white pb-2 dark:bg-stone-950 sm:static sm:bg-transparent dark:sm:bg-transparent sm:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 sm:pt-0">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Beans
        </h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {filteredRowCount} bean
                {filteredRowCount !== 1 ? "s" : ""}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem
                onClick={onExport}
                className="flex items-center gap-3 px-4 py-3 text-base"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-md border border-amber-700 bg-amber-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            Add beans
          </button>
        </div>
      </div>

      {isSelecting && (
        <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/50">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {selectedCount} {selectedCount === 1 ? "bean" : "beans"} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canCompare && (
              <button
                type="button"
                onClick={onCompare}
                className="rounded-md bg-stone-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-500"
              >
                Compare
              </button>
            )}
            <button
              type="button"
              onClick={onDeselectAll}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search beans, roasters, origins…"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-500"
        />
        {globalFilter && (
          <button
            type="button"
            onClick={() => onGlobalFilterChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            Clear
          </button>
        )}
      </div>

      <FilterBar table={table} filters={filterDescriptors} />
    </div>
  );
}
