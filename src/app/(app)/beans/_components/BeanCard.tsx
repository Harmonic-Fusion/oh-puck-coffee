"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import type { BeanWithCounts } from "@/components/beans/hooks";
import { cn } from "@/lib/utils";
import { formatDate } from "./bean-table-utils";

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-stone-700 dark:text-stone-300">
        {value}
      </p>
    </div>
  );
}

export interface BeanCardProps {
  bean: BeanWithCounts;
  onClick: (bean: BeanWithCounts) => void;
  onSelect?: (bean: BeanWithCounts) => void;
  isSelected?: boolean;
  isSelecting?: boolean;
}

function ratingLabel(bean: BeanWithCounts): string {
  if (bean.bestRating != null) {
    return `★ ${bean.bestRating.toFixed(1)}`;
  }
  if (bean.avgRating != null) {
    return `★ ${bean.avgRating.toFixed(1)} avg`;
  }
  return "—";
}

export function BeanCard({ bean, onClick, onSelect, isSelected, isSelecting }: BeanCardProps) {
  const muted = bean.allShotsHidden;

  return (
    <div
      onClick={() => {
        if (isSelecting && onSelect) {
          onSelect(bean);
        } else {
          onClick(bean);
        }
      }}
      className={cn(
        "relative rounded-xl border bg-white p-4 transition-colors dark:bg-stone-900",
        "cursor-pointer active:bg-stone-50 dark:active:bg-stone-800",
        isSelected
          ? "border-stone-400 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/50"
          : "border-stone-200 dark:border-stone-700",
        muted && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            muted
              ? "text-stone-400 dark:text-stone-600"
              : "text-stone-800 dark:text-stone-200",
          )}
        >
          {bean.name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {muted && (
            <span
              className="text-stone-400 dark:text-stone-500"
              title="Shots hidden from stats"
              aria-label="Shots hidden from stats"
            >
              <EyeSlashIcon className="h-5 w-5" aria-hidden />
            </span>
          )}
          <EyeIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
          {/* REMOVE FOR NOW:{onSelect && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(bean);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-stone-600 focus:ring-stone-500 dark:border-stone-600 dark:focus:ring-stone-500"
            />
          )} */}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCell label="Roast" value={bean.roastLevel ?? "—"} />
        <StatCell label="Roaster" value={bean.roaster ?? "—"} />
        <StatCell label="Roast Date" value={formatDate(bean.roastDate)} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <StatCell label="Rating" value={ratingLabel(bean)} />
        <StatCell label="Shots" value={String(bean.shotCount)} />
        <StatCell label="Last Shot" value={formatDate(bean.lastShotAt)} />
      </div>

      {bean.commonFlavors && bean.commonFlavors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bean.commonFlavors.map((flavor) => (
            <span
              key={flavor}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              {flavor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
