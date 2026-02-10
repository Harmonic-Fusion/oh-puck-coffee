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

// Mobile card component for <768px
function ShotCard({
  shot,
  onDelete,
  onToggleReference,
  onClick,
}: {
  shot: ShotWithJoins;
  onDelete?: (id: string) => void;
  onToggleReference?: (id: string) => void;
  onClick?: (shot: ShotWithJoins) => void;
}) {
  const isRef = shot.isReferenceShot;
  const ratio = shot.brewRatio ? `1:${shot.brewRatio}` : "—";
  const date = new Date(shot.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => onClick?.(shot)}
      className={`rounded-xl border bg-white p-4 transition-colors dark:bg-stone-900 ${
        onClick ? "cursor-pointer active:bg-stone-50 dark:active:bg-stone-800" : ""
      } ${
        isRef
          ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10"
          : "border-stone-200 dark:border-stone-700"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-200">
            {shot.beanName || "Unknown Bean"}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {shot.shotQuality}/10
          </span>
          {isRef && <span className="text-amber-500">⭐</span>}
        </div>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Dose
          </p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {shot.doseGrams}g
          </p>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Yield
          </p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {shot.yieldGrams}g
          </p>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Ratio
          </p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {ratio}
          </p>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Time
          </p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {shot.brewTimeSecs}s
          </p>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Grind
          </p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            {shot.grindLevel}
          </p>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            By
          </p>
          <p className="truncate text-sm font-semibold text-stone-700 dark:text-stone-300">
            {shot.userName || "—"}
          </p>
        </div>
      </div>

      {/* Flavors from Flavor Wheel */}
      {shot.flavorWheelCategories && Object.keys(shot.flavorWheelCategories).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.keys(shot.flavorWheelCategories).slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 dark:bg-stone-800 dark:text-stone-400"
            >
              {cat}
            </span>
          ))}
          {Object.keys(shot.flavorWheelCategories).length > 4 && (
            <span className="text-[10px] text-stone-400">
              +{Object.keys(shot.flavorWheelCategories).length - 4}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        className="mt-3 flex items-center gap-3 border-t border-stone-100 pt-2 dark:border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {onToggleReference && (
          <button
            onClick={() => onToggleReference(shot.id)}
            className="text-xs text-stone-400 hover:text-amber-500 dark:text-stone-500"
          >
            {isRef ? "Unmark reference" : "Mark reference"}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(shot.id)}
            className="text-xs text-stone-400 hover:text-red-500 dark:text-stone-500"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
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

  // Get sorted data for card view
  const sortedData = table.getRowModel().rows.map((row) => row.original);

  return (
    <>
      {/* Mobile card layout (<768px) */}
      <div className="flex flex-col gap-3 md:hidden">
        {sortedData.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onDelete={onDelete}
            onToggleReference={onToggleReference}
            onClick={onClickShot}
          />
        ))}
      </div>

      {/* Desktop table layout (≥768px) */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 md:block dark:border-stone-700">
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
    </>
  );
}
