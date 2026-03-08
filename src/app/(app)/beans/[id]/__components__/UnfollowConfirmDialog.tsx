"use client";

import { Modal } from "@/components/common/Modal";

interface UnfollowConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  beanName: string;
  onConfirm: () => void;
  isPending: boolean;
}

export function UnfollowConfirmDialog({
  open,
  onClose,
  beanName,
  onConfirm,
  isPending,
}: UnfollowConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unfollow bean?"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
          >
            {isPending ? "Unfollowing…" : "Unfollow"}
          </button>
        </div>
      }
    >
      <p className="text-stone-600 dark:text-stone-400">
        You will no longer see shared shots or log new shots for{" "}
        <span className="font-medium text-stone-800 dark:text-stone-200">
          {beanName}
        </span>
        . You can re-follow later using the share link.
      </p>
    </Modal>
  );
}
