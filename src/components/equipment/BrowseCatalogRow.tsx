"use client";

import type { EquipmentType } from "@/shared/equipment/schema";
import { EquipmentIcon } from "./coffee-icons";

export function BrowseCatalogRow({
  type,
  name,
  detail,
  thumbnailSrc,
  kindLabel,
  onAdd,
  adding,
}: {
  type: EquipmentType;
  name: string;
  detail?: string;
  thumbnailSrc?: string;
  /** Shown before the name when browsing mixed equipment types (e.g. Grinder / Machine). */
  kindLabel?: string;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center text-stone-500 dark:text-stone-400"
          aria-hidden
        >
          <EquipmentIcon type={type} className="h-8 w-8" />
        </span>
        {thumbnailSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- data URLs and /api/images URLs
          <img
            src={thumbnailSrc}
            alt=""
            className="h-8 w-8 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {kindLabel ? (
              <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                {kindLabel}
              </span>
            ) : null}
            <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-200">{name}</p>
          </div>
          {detail ? (
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{detail}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        disabled={adding}
        onClick={onAdd}
        className="shrink-0 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {adding ? "…" : "Add"}
      </button>
    </div>
  );
}
