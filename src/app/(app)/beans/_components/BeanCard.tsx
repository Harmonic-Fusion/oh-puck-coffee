"use client";

import {
  EyeSlashIcon,
  PencilSquareIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import type { BeanWithCounts } from "@/components/beans/hooks";
import { ActionButtonBar, type ActionButtonConfig } from "@/components/shots/ActionButtonBar";
import { BeanIcon } from "@/components/common/BeanIcon";
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
  onEdit: (bean: BeanWithCounts) => void;
  onView: (bean: BeanWithCounts) => void;
  onBrew: (bean: BeanWithCounts) => void;
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

export function BeanCard({
  bean,
  onClick,
  onEdit,
  onView,
  onBrew,
  onSelect,
  isSelected,
  isSelecting,
}: BeanCardProps) {
  const muted = bean.allShotsHidden;

  const actions: ActionButtonConfig[] = [
    {
      key: "edit",
      icon: PencilSquareIcon,
      onClick: () => onEdit(bean),
      title: "Edit bean",
    },
    {
      key: "view",
      icon: BeanIcon,
      onClick: () => onView(bean),
      title: "View bean",
    },
    {
      key: "brew",
      icon: PlusCircleIcon,
      onClick: () => onBrew(bean),
      title: "Brew",
    },
  ];

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

      <div
        className="mt-3 flex h-10 w-full items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full">
          <ActionButtonBar actions={actions} />
        </div>
        {/* {!isSelecting ? (
          <div className={onSelect ? "flex-[0.9]" : "w-full"}>
            <ActionButtonBar actions={actions} />
          </div>
        ) : (
          <div className="flex flex-[0.9] gap-2">
            <div className="h-10 flex-1" aria-hidden="true" />
            <div className="h-10 flex-1" aria-hidden="true" />
            <div className="h-10 flex-1" aria-hidden="true" />
          </div>
        )}
        {onSelect && (
          <div className="flex flex-[0.1] justify-end">
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(bean);
              }}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
              title="Select"
            />
          </div>
        )} */}
      </div>
    </div>
  );
}
