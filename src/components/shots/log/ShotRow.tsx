"use client";

import { flexRender, type Row } from "@tanstack/react-table";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface ShotRowProps {
  row: Row<ShotWithJoins>;
  onToggleReference?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onClick?: (shot: ShotWithJoins) => void;
}

export function ShotRow({
  row,
  onToggleReference,
  onToggleHidden,
  onClick,
}: ShotRowProps) {
  const shot = row.original;
  const isRef = shot.isReferenceShot;
  const isHidden = shot.isHidden;

  return (
    <tr
      onClick={() => onClick?.(shot)}
      className={`border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50 ${
        onClick ? "cursor-pointer" : ""
      } ${
        isRef
          ? "border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
          : ""
      } ${row.getIsSelected() ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}`}
    >
      <td
        className="px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
      </td>
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
          {onToggleHidden && (
            <button
              onClick={() => onToggleHidden(shot.id)}
              className={`transition-transform hover:scale-110 ${
                isHidden
                  ? "text-stone-500"
                  : "text-stone-300 hover:text-stone-500 dark:text-stone-600"
              }`}
              title={isHidden ? "Show shot" : "Hide shot"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isHidden ? (
                  <>
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
