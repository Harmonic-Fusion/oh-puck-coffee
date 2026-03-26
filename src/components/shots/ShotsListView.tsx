"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ShotWithJoins } from "@/components/shots/hooks";
import type { BeanWithUserData } from "@/shared/beans/schema";
import { ShotLimitBanner } from "@/components/billing/ShotLimitBanner";
import { ShotDetail } from "@/components/shots/ShotDetail";
import { AppRoutes } from "@/app/routes";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StickyFilterBar } from "@/components/ui/StickyFilterBar";
import {
  ShotsHistoryTable,
  ShotsSelectionBar,
  ShotsDownloadMenu,
  useShotsHistoryController,
} from "@/components/shots/ShotsHistory";
import { ParameterRatingChart } from "@/components/shots/ParameterRatingChart";
import type { FilterParams } from "@/lib/use-filter-params";

export interface ShotsListViewProps {
  shots: ShotWithJoins[];
  /** When present and `limit` is set, shows the billing shot-limit banner. */
  shotCount?: { total: number; limit: number | null } | null;
  /** URL-backed filter state; when provided, shows StickyFilterBar. */
  filterParams?: FilterParams;
  beans?: BeanWithUserData[];
}

export function ShotsListView({ shots, shotCount, filterParams, beans = [] }: ShotsListViewProps) {
  const { data: session } = useSession();
  const ctrl = useShotsHistoryController({
    data: shots,
    currentUserId: session?.user?.id,
  });

  return (
    <div className="space-y-4">
      {shotCount?.limit != null && (
        <ShotLimitBanner
          totalCount={shotCount.total}
          limit={shotCount.limit}
        />
      )}

      {/* Page header + actions */}
      <div className="flex items-center justify-between pt-4 sm:pt-0">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Shots
        </h1>
        <div className="flex items-center gap-2">
          <ShotsDownloadMenu
            rowCount={ctrl.filteredRowCount}
            onExportCsv={ctrl.handleExport}
            onCopyForAi={ctrl.handleCopyForAi}
          />
          <Link
            href={AppRoutes.log.path}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-700"
            title="Log a shot"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Log shot
          </Link>
        </div>
      </div>

      {ctrl.isSelecting && (
        <ShotsSelectionBar
          selectedIds={ctrl.selectedIds}
          onDeselectAll={ctrl.handleDeselectAll}
          onRequestDelete={ctrl.handleRequestBulkDelete}
          onBulkReference={ctrl.handleBulkReference}
          onBulkHide={ctrl.handleBulkHide}
        />
      )}

      {/* Global search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search beans, grinders, machines, notes…"
          value={ctrl.globalFilter}
          onChange={(e) => ctrl.setGlobalFilter(e.target.value)}
          className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-500"
        />
        {ctrl.globalFilter && (
          <button
            type="button"
            onClick={() => ctrl.setGlobalFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sticky filter bar (date + beans via URL params) */}
      {filterParams && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <StickyFilterBar filterParams={filterParams} beans={beans} />
        </div>
      )}

      <ParameterRatingChart shots={shots} />

      <ShotsHistoryTable
        table={ctrl.table}
        onRowOpen={ctrl.handleRowOpen}
        tempUnit={ctrl.tempUnit}
        selectedIds={ctrl.selectedIds}
        onToggleSelect={ctrl.handleToggleSelect}
        isSelecting={ctrl.isSelecting}
        onToggleReference={ctrl.handleToggleReference}
        onToggleHidden={ctrl.handleToggleHidden}
        onDuplicate={ctrl.handleDuplicate}
        onEdit={ctrl.handleEdit}
        onShare={ctrl.handleShare}
      />

      <ShotDetail
        shot={ctrl.selectedShot}
        open={!!ctrl.selectedShot}
        onClose={ctrl.handleDetailClose}
        onDelete={ctrl.handleDelete}
        onToggleReference={ctrl.handleToggleReference}
        onToggleHidden={ctrl.handleToggleHidden}
        shots={ctrl.filteredShots}
        currentIndex={ctrl.selectedShotIndex}
        onShotChange={ctrl.handleDetailShotChange}
        initialEditMode={ctrl.openInEditMode}
      />

      <ConfirmDialog
        open={ctrl.bulkDeleteOpen}
        onOpenChange={ctrl.handleBulkDeleteOpenChange}
        title="Delete shots?"
        description={ctrl.bulkDeleteDescription}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={ctrl.handleBulkDeleteConfirm}
      />
    </div>
  );
}
