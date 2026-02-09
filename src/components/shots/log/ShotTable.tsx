"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { ShotRow } from "./ShotRow";

const columnHelper = createColumnHelper<ShotWithJoins>();

const columns = [
  columnHelper.accessor("createdAt", {
    header: "Date",
    cell: (info) =>
      new Date(info.getValue()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  }),
  columnHelper.accessor("userName", {
    header: "User",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("beanName", {
    header: "Bean",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("doseGrams", {
    header: "Dose",
    cell: (info) => `${info.getValue()}g`,
  }),
  columnHelper.accessor("yieldGrams", {
    header: "Yield",
    cell: (info) => `${info.getValue()}g`,
  }),
  columnHelper.accessor("brewRatio", {
    header: "Ratio",
    cell: (info) => {
      const val = info.getValue();
      return val ? `1:${val}` : "—";
    },
  }),
  columnHelper.accessor("brewTimeSecs", {
    header: "Time",
    cell: (info) => `${info.getValue()}s`,
  }),
  columnHelper.accessor("grindLevel", {
    header: "Grind",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("shotQuality", {
    header: "Quality",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-amber-600 dark:text-amber-400">{val}</span>
          <span className="text-stone-400 dark:text-stone-500">/ 10</span>
        </span>
      );
    },
  }),
];

interface ShotTableProps {
  data: ShotWithJoins[];
  onDelete?: (id: string) => void;
  onToggleReference?: (id: string) => void;
  onClickShot?: (shot: ShotWithJoins) => void;
}

export function ShotTable({
  data,
  onDelete,
  onToggleReference,
  onClickShot,
}: ShotTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">☕</span>
        <h3 className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-300">
          No shots yet
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Log your first espresso shot to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer px-4 py-3 font-medium text-stone-600 select-none hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" && " ↑"}
                    {header.column.getIsSorted() === "desc" && " ↓"}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                Actions
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <ShotRow
              key={row.id}
              row={row}
              onDelete={onDelete}
              onToggleReference={onToggleReference}
              onClick={onClickShot}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
