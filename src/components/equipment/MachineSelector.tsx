"use client";

import { useMemo } from "react";
import { useMachines } from "./hooks";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface MachineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}

export function MachineSelector({
  value,
  onChange,
  error,
  id,
}: MachineSelectorProps) {
  const { data: machines, isLoading } = useMachines();

  const options = useMemo(
    () =>
      machines
        ? [...machines]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((m) => ({
              value: m.id,
              label: m.name,
              thumbnailBase64: m.thumbnailBase64,
            }))
        : [],
    [machines],
  );

  return (
    <div className="w-full">
      <label
        className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200"
        tabIndex={-1}
      >
        Machine
      </label>
      {!isLoading && options.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center dark:border-stone-600 dark:bg-stone-900/40">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have any machines in your collection yet.
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={value}
              onChange={onChange}
              options={options}
              placeholder="Select a machine..."
              isLoading={isLoading}
              error={error}
              emptyMessage="No machines match your search"
              id={id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
