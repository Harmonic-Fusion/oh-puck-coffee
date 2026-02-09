"use client";

import { flexRender, type Row } from "@tanstack/react-table";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface ShotRowProps {
  row: Row<ShotWithJoins>;
  onDelete?: (id: string) => void;
  onToggleReference?: (id: string) => void;
  onClick?: (shot: ShotWithJoins) => void;
}

export function ShotRow({
  row,
  onDelete,
  onToggleReference,
  onClick,
}: ShotRowProps) {
  const shot = row.original;
  const isRef = shot.isReferenceShot;

  return (
    <tr
      onClick={() => onClick?.(shot)}
      className={`border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50 ${
        onClick ? "cursor-pointer" : ""
      } ${
        isRef
          ? "border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
          : ""
      }`}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="whitespace-nowrap px-4 py-3 text-stone-700 dark:text-stone-300"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      <td className="px-4 py-3">
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {onToggleReference && (
            <button
              onClick={() => onToggleReference(shot.id)}
              className={`text-lg transition-transform hover:scale-110 ${
                isRef
                  ? "text-amber-500"
                  : "text-stone-300 hover:text-amber-400 dark:text-stone-600"
              }`}
              title={
                isRef
                  ? "Remove reference shot"
                  : "Mark as reference shot"
              }
            >
              {isRef ? "⭐" : "☆"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(shot.id)}
              className="text-xs text-stone-400 hover:text-red-500"
              title="Delete shot"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
