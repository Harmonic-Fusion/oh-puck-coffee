"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/common/Toast";
import { useUnlinkSheet } from "./hooks";
import type { Integration } from "@/shared/integrations/schema";

interface IntegrationStatusProps {
  integration: Integration;
}

export function IntegrationStatus({ integration }: IntegrationStatusProps) {
  const unlinkSheet = useUnlinkSheet();
  const { showToast } = useToast();
  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false);

  const handleUnlink = () => {
    setConfirmUnlinkOpen(true);
  };

  const handleConfirmUnlink = () => {
    unlinkSheet.mutate(integration.id, {
      onSuccess: () => showToast("success", "Sheet unlinked."),
    });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="font-semibold text-stone-800 dark:text-stone-200">
              Google Sheets
            </h3>
            {integration.isActive ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Inactive
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            {integration.spreadsheetName || "Linked spreadsheet"}
          </p>

          {integration.spreadsheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${integration.spreadsheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Open in Google Sheets →
            </a>
          )}

          {!integration.isActive && (
            <p className="mt-2 text-xs text-red-500">
              Token expired. Re-sign in or re-link the sheet to resume syncing.
            </p>
          )}

          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
            Linked {new Date(integration.createdAt).toLocaleDateString()}
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={handleUnlink}
          loading={unlinkSheet.isPending}
        >
          Unlink
        </Button>
      </div>

      {unlinkSheet.isError && (
        <p className="mt-2 text-sm text-red-500">
          {unlinkSheet.error.message}
        </p>
      )}
      <ConfirmDialog
        open={confirmUnlinkOpen}
        onOpenChange={setConfirmUnlinkOpen}
        title="Unlink Google Sheet?"
        description="New shots will no longer sync to this sheet."
        confirmLabel="Unlink"
        variant="danger"
        loading={unlinkSheet.isPending}
        onConfirm={handleConfirmUnlink}
      />
    </div>
  );
}
