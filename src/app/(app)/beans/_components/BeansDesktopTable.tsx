"use client";

import { flexRender } from "@tanstack/react-table";
import type { Row, Table } from "@tanstack/react-table";
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { BeanWithCounts } from "@/components/beans/hooks";
import { cn } from "@/lib/utils";
import { SortIcon } from "@/components/ui/filter-bar";
import { beansTableColumnCount } from "./beans-table-columns";
import { PaginationButton } from "./BeanPageFilters";

export function BeansDesktopTable({
  table,
  rows,
  filteredCount,
  selectedIds,
  onToggleSelectAll,
  onBeanClick,
  onToggleBeanSelect,
}: {
  table: Table<BeanWithCounts>;
  /** Current page of rows (filtered + sorted + paginated). */
  rows: Row<BeanWithCounts>[];
  /** Total rows matching filters (all pages), for “select all” state. */
  filteredCount: number;
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onBeanClick: (bean: BeanWithCounts) => void;
  onToggleBeanSelect: (bean: BeanWithCounts) => void;
}) {
  const allFilteredSelected =
    selectedIds.size === filteredCount && filteredCount > 0;

  return (
    <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <th className="whitespace-nowrap px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={onToggleSelectAll}
                      className="h-4 w-4 rounded border-stone-300 text-stone-600 focus:ring-stone-500 dark:border-stone-600 dark:focus:ring-stone-500"
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
              {rows.length > 0 ? (
                rows.map((row) => {
                  const bean = row.original;
                  const muted = bean.allShotsHidden;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onBeanClick(bean)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50",
                        selectedIds.has(bean.id)
                          ? "bg-stone-100 dark:bg-stone-800/50"
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
                          onChange={() => onToggleBeanSelect(bean)}
                          className="h-4 w-4 rounded border-stone-300 text-stone-600 focus:ring-stone-500 dark:border-stone-600 dark:focus:ring-stone-500"
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
                    colSpan={beansTableColumnCount + 1}
                    className="px-3 py-8 text-center text-stone-400 dark:text-stone-500"
                  >
                    No matching beans.
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
  );
}
