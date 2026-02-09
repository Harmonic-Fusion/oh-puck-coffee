"use client";

import { useState } from "react";
import { useGrinders, useCreateGrinder } from "./hooks";

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

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
        Grinder
      </label>
      {!showCreate ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
              error
                ? "border-red-400"
                : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            }`}
          >
            <option value="">
              {isLoading ? "Loading..." : "Select a grinder..."}
            </option>
            {grinders?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            + New
          </button>
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
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {createGrinder.isPending ? "..." : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
