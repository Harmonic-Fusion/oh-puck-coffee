"use client";

import type { PublicBeanSummary } from "@/components/beans/hooks";

export function PublicBeanRow({
  bean,
  onAdd,
  isAdding,
  inCollection,
}: {
  bean: PublicBeanSummary;
  onAdd: () => void;
  isAdding: boolean;
  inCollection?: boolean;
}) {
  const subtitle = [bean.origin, bean.roaster, bean.roastLevel]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-800">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-800 dark:text-stone-200">
          {bean.name}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {subtitle}
          </p>
        )}
      </div>
      {inCollection ? (
        <span className="shrink-0 text-xs font-medium text-stone-500 dark:text-stone-400">
          In your collection
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={isAdding}
          className="shrink-0 rounded-lg border border-amber-700 bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-60 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
        >
          {isAdding ? "Adding…" : "Add"}
        </button>
      )}
    </div>
  );
}
