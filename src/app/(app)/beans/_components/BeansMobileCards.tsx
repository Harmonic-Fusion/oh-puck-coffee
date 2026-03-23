"use client";

import type { Row } from "@tanstack/react-table";
import type { BeanWithCounts } from "@/components/beans/hooks";
import { BeanCard } from "./BeanCard";

export function BeansMobileCards({
  rows,
  onBeanClick,
  onToggleBeanSelect,
  selectedIds,
  isSelecting,
}: {
  /** All filtered rows in current sort order (no pagination). */
  rows: Row<BeanWithCounts>[];
  onBeanClick: (bean: BeanWithCounts) => void;
  onToggleBeanSelect: (bean: BeanWithCounts) => void;
  selectedIds: Set<string>;
  isSelecting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {rows.length > 0 ? (
        rows.map((row) => (
          <BeanCard
            key={row.id}
            bean={row.original}
            onClick={onBeanClick}
            onSelect={onToggleBeanSelect}
            isSelected={selectedIds.has(row.original.id)}
            isSelecting={isSelecting}
          />
        ))
      ) : (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No matching beans.
        </p>
      )}
    </div>
  );
}
