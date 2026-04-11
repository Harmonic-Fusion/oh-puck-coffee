"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useAdminData } from "./hooks";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnDef<T = any> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface GenericDataTableProps<T extends Record<string, any>> {
  endpoint: string;
  columns: ColumnDef<T>[];
  title?: string;
  defaultPageSize?: number;
  searchable?: boolean;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  rowHref?: (row: T) => string;
  /** Appended as query params (e.g. type filter). Omit empty values. */
  extraParams?: Record<string, string>;
  /** When true, first column is row checkboxes + header select-all for the current page. */
  selectable?: boolean;
  /** Stable row id for selection (defaults to `String(row.id)`). */
  getRowId?: (row: T) => string;
  /** When this value changes, selection is cleared (e.g. `JSON.stringify(extraParams)`). */
  selectionResetKey?: string;
  /** Called whenever the selected id set changes. */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Renders above the table when at least one row is selected. */
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
}

function formatValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-stone-400">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
          value
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-stone-400">—</span>;
    return (
      <span className="text-xs text-stone-600 dark:text-stone-400">
        [{value.join(", ")}]
      </span>
    );
  }
  if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    try {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        return (
          <span className="text-xs text-stone-600 dark:text-stone-400">
            {date.toLocaleDateString()}
          </span>
        );
      }
    } catch {
      // fall through
    }
  }
  if (typeof value === "string" && value.length > 60) {
    return (
      <span title={value} className="block max-w-[200px] truncate text-xs">
        {value}
      </span>
    );
  }
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GenericDataTable<T extends Record<string, any>>({
  endpoint,
  columns,
  title,
  defaultPageSize = 25,
  searchable = false,
  toolbar,
  rowActions,
  rowHref,
  extraParams,
  selectable = false,
  getRowId = (row: T) => String((row as { id?: string }).id ?? ""),
  selectionResetKey,
  onSelectionChange,
  bulkActions,
}: GenericDataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const prevSelectionResetKey = useRef(selectionResetKey);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  useEffect(() => {
    if (selectionResetKey === undefined) return;
    if (prevSelectionResetKey.current !== selectionResetKey) {
      setSelectedIds([]);
    }
    prevSelectionResetKey.current = selectionResetKey;
  }, [selectionResetKey]);

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedIds);
  }, [selectedIds]);

  const { data, isLoading, isError, error } = useAdminData<T>(endpoint, {
    limit: pageSize,
    offset: page * pageSize,
    search: search || undefined,
    extraParams,
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(searchInput);
      setPage(0);
    },
    [searchInput]
  );

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(0);
  }

  const sortedRows = useMemo(() => {
    if (!data?.data || !sortKey) return data?.data ?? [];
    return [...data.data].sort((a, b) => {
      const aVal = a[sortKey as keyof T];
      const bVal = b[sortKey as keyof T];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const pageRowIds = useMemo(
    () => sortedRows.map((row) => getRowId(row)).filter((id) => id.length > 0),
    [sortedRows, getRowId],
  );

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el || !selectable) return;
    const n = pageRowIds.length;
    const selectedOnPage = pageRowIds.filter((id) => selectedIds.includes(id)).length;
    el.indeterminate = selectedOnPage > 0 && selectedOnPage < n;
  }, [selectable, pageRowIds, selectedIds]);

  function toggleSelectAllOnPage() {
    const allSelected =
      pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageRowIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageRowIds])]);
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allOnPageSelected =
    selectable &&
    pageRowIds.length > 0 &&
    pageRowIds.every((id) => selectedIds.includes(id));

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const currentPage = page + 1;
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, data?.total ?? 0);

  return (
    <div>
      {(title || searchable || toolbar) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {title && (
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {title}
              </h1>
            )}
            {toolbar}
          </div>
          {searchable && (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-64 rounded-md border border-stone-200 bg-white pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setPage(0);
                  }}
                  className="h-9 rounded-md px-3 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                >
                  Clear
                </button>
              )}
            </form>
          )}
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-stone-500">
            Loading...
          </div>
        )}

        {isError && (
          <div className="py-12 text-center text-red-600 dark:text-red-400">
            Error: {error instanceof Error ? error.message : "Failed to load data"}
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {selectable && selectedIds.length > 0 && bulkActions && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-stone-200 bg-amber-50/95 px-4 py-2.5 dark:border-stone-700 dark:bg-stone-800/95">
                {bulkActions(selectedIds, clearSelection)}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-10">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                  )}
                  {columns.map((col) => {
                    const key = String(col.key);
                    const isSorted = sortKey === key;
                    return (
                      <TableHead
                        key={key}
                        className={col.className}
                      >
                        {col.sortable !== false ? (
                          <button
                            type="button"
                            onClick={() => handleSort(key)}
                            className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100"
                          >
                            {col.label}
                            {isSorted ? (
                              sortDir === "asc"
                                ? <ChevronUpIcon className="h-3.5 w-3.5" />
                                : <ChevronDownIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
                            )}
                          </button>
                        ) : (
                          col.label
                        )}
                      </TableHead>
                    );
                  })}
                  {rowActions && <TableHead className="w-px" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0)
                      }
                      className="py-8 text-center text-stone-400"
                    >
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((row, rowIndex) => {
                    const href = rowHref?.(row);
                    const rowId = getRowId(row);
                    return (
                      <TableRow
                        key={rowId || String(rowIndex)}
                        className={href ? "cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50" : undefined}
                      >
                        {selectable && (
                          <TableCell
                            className="w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(rowId)}
                              disabled={!rowId}
                              onChange={() => toggleRow(rowId)}
                              className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                              aria-label={`Select row ${rowId}`}
                            />
                          </TableCell>
                        )}
                        {columns.map((col) => {
                          const value = row[col.key as keyof T];
                          const cell = col.render
                            ? col.render(value, row)
                            : formatValue(value);
                          return (
                            <TableCell key={String(col.key)} className={col.className}>
                              {href ? (
                                <Link href={href} className="block">
                                  {cell}
                                </Link>
                              ) : (
                                cell
                              )}
                            </TableCell>
                          );
                        })}
                        {rowActions && (
                          <TableCell className="text-right">
                            {rowActions(row)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 dark:border-stone-700">
              <div className="flex items-center gap-3">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {data.total === 0
                    ? "No records"
                    : `Showing ${startItem}–${endItem} of ${data.total}`}
                </p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="h-7 rounded border border-stone-200 bg-white px-1.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  {currentPage} / {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
