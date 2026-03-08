"use client";

import { Modal } from "@/components/common/Modal";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

type ShotOption = "duplicate" | "migrate" | "none";

interface DuplicateBeanModalProps {
  open: boolean;
  onClose: () => void;
  beanName: string;
  shotOption: ShotOption;
  onShotOptionChange: (value: ShotOption) => void;
  onDuplicate: () => void;
  isPending: boolean;
}

export function DuplicateBeanModal({
  open,
  onClose,
  beanName,
  shotOption,
  onShotOptionChange,
  onDuplicate,
  isPending,
}: DuplicateBeanModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duplicate bean"
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
            onClick={onDuplicate}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            {isPending ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-stone-600 dark:text-stone-400">
        Create your own copy of{" "}
        <span className="font-medium text-stone-800 dark:text-stone-200">
          {beanName}
        </span>
        .
      </p>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Shots
      </label>
      <select
        value={shotOption}
        onChange={(e) =>
          onShotOptionChange(e.target.value as ShotOption)
        }
        className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
      >
        <option value="duplicate">Copy my shots</option>
        <option value="migrate">Move my shots</option>
        <option value="none">No shots</option>
      </select>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        {shotOption === "duplicate" &&
          "Copies your shots to the new bean. Originals stay on this bean."}
        {shotOption === "migrate" &&
          "Moves your shots to the new bean. They will no longer appear here."}
        {shotOption === "none" && "Creates an empty bean. No shots copied."}
      </p>
    </Modal>
  );
}
