"use client";

import { useState } from "react";
import { useGrinders, useCreateGrinder } from "./hooks";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface GrinderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function GrinderSelector({
  value,
  onChange,
  error,
}: GrinderSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: grinders, isLoading } = useGrinders();
  const createGrinder = useCreateGrinder();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const grinder = await createGrinder.mutateAsync({
        name: newName.trim(),
      });
      onChange(grinder.id);
      setShowCreate(false);
      setNewName("");
    } catch {
      // Error handled by mutation
    }
  };

  const options =
    grinders?.map((g) => ({
      value: g.id,
      label: g.name,
    })) || [];

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
        Grinder
      </label>
      {!showCreate ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={value}
              onChange={onChange}
              options={options}
              placeholder="Select a grinder..."
              isLoading={isLoading}
              error={error}
              onAddNew={(text) => { setNewName(text); setShowCreate(true); }}
              emptyMessage="No grinders found"
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <input
            type="text"
            placeholder="Grinder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createGrinder.isPending || !newName.trim()}
            tabIndex={-1}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {createGrinder.isPending ? "..." : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            tabIndex={-1}
            className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
