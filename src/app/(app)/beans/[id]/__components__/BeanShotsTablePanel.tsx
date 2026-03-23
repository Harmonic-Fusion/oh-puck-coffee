"use client";

import type { ShotWithJoins } from "@/components/shots/hooks";
import { ShotDetail } from "@/components/shots/ShotDetail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ShotsHistoryTable,
  ShotsSelectionBar,
  type ShotsHistoryController,
} from "@/components/shots/ShotsHistory";

interface BeanShotsTablePanelProps {
  ctrl: ShotsHistoryController;
  editable: boolean;
  canMutateShot: (shot: ShotWithJoins) => boolean;
  isLoading: boolean;
}

export function BeanShotsTablePanel({
  ctrl,
  editable,
  canMutateShot,
  isLoading,
}: BeanShotsTablePanelProps) {
  return (
    <div className="space-y-4">
      {editable && ctrl.isSelecting && (
        <ShotsSelectionBar
          selectedIds={ctrl.selectedIds}
          onDeselectAll={ctrl.handleDeselectAll}
          onRequestDelete={ctrl.handleRequestBulkDelete}
          onBulkReference={ctrl.handleBulkReference}
          onBulkHide={ctrl.handleBulkHide}
        />
      )}

      <ShotsHistoryTable
        table={ctrl.table}
        isLoading={isLoading}
        editable={editable}
        canMutateShot={canMutateShot}
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
        readOnly={!!ctrl.selectedShot && !canMutateShot(ctrl.selectedShot)}
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
