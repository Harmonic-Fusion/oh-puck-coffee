"use client";

import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
  title: string;
  /** Optional subtitle or helper text under the title. */
  description?: ReactNode;
  isLoading?: boolean;
  /**
   * Chart controls (filters, toggles, selects, etc.).
   * Rendered below the title row; when `isLoading`, replaced by a skeleton.
   */
  controllers?: ReactNode;
  footer?: ReactNode;
  /**
   * Height (px) for the Recharts `ResponsiveContainer` when the chart is shown.
   * Also used as the minimum height for `noDataOverlay` when `showNoData` is true.
   * @default 300
   */
  chartHeight?: number;
  /**
   * When true, the chart area shows `noDataOverlay` instead of `children`
   * inside `ResponsiveContainer`.
   */
  showNoData?: boolean;
  /**
   * Centered message in the chart area when `showNoData` is true.
   * Styled like the shared empty states (stone-400 text).
   */
  noDataOverlay?: ReactNode;
  /**
   * Rendered below the chart region (e.g. X-axis metric or parameter selector).
   */
  xController?: ReactNode;
  /** Recharts chart (`BarChart`, `ScatterChart`, …); omit when `showNoData` only. */
  children?: ReactNode;
}

function ChartAreaSkeleton(): ReactNode {
  return (
    <div className="h-64 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
  );
}

function HeaderDescriptionSkeleton(): ReactNode {
  return (
    <div className="space-y-1.5">
      <div className="h-3 max-w-md animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
      <div className="h-3 max-w-sm animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
    </div>
  );
}

function ControllersSkeleton(): ReactNode {
  return (
    <div className="flex flex-wrap gap-3 sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-3 w-14 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
        <div className="flex gap-1">
          <div className="h-8 w-16 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
        <div className="flex gap-1">
          <div className="h-8 w-8 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
        </div>
      </div>
    </div>
  );
}

export function ChartContainer({
  title,
  description,
  isLoading = false,
  controllers,
  footer,
  chartHeight = 300,
  showNoData = false,
  noDataOverlay,
  xController,
  children,
}: ChartContainerProps): ReactNode {
  const showControllersRow = controllers != null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <header>
        <div className="border-b border-stone-200 pb-4 dark:border-stone-700">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              {title}
            </h3>
            {description != null && (
              <div className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {isLoading ? <HeaderDescriptionSkeleton /> : description}
              </div>
            )}
          </div>
        </div>

        {showControllersRow && (
          <div className="border-b border-stone-200 py-4 dark:border-stone-700">
            {isLoading ? <ControllersSkeleton /> : controllers}
          </div>
        )}
      </header>

      <div className="min-h-[12rem] pt-4">
        {isLoading ? (
          <ChartAreaSkeleton />
        ) : showNoData ? (
          <>
            <div
              className="flex items-center justify-center px-2 text-center text-sm text-stone-400 dark:text-stone-500"
              style={{ minHeight: chartHeight }}
            >
              {noDataOverlay}
            </div>
            {xController != null && (
              <div className="mt-2 flex justify-center">{xController}</div>
            )}
          </>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              {children}
            </ResponsiveContainer>
            {xController != null && (
              <div className="mt-2 font-xl flex justify-center">{xController}</div>
            )}
          </>
        )}
      </div>

      {footer != null && (
        <footer className="mt-4 border-t border-stone-200 pt-4 text-[11px] text-stone-400 dark:border-stone-700 dark:text-stone-500">
          {isLoading ? null : footer}
        </footer>
      )}
    </div>
  );
}
