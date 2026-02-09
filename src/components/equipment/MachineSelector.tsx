"use client";

import { useState } from "react";
import { useMachines, useCreateMachine } from "./hooks";

interface MachineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function MachineSelector({
  value,
  onChange,
  error,
}: MachineSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: machines, isLoading } = useMachines();
  const createMachine = useCreateMachine();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const machine = await createMachine.mutateAsync({
        name: newName.trim(),
      });
      onChange(machine.id);
      setShowCreate(false);
      setNewName("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
        Machine <span className="text-stone-400">(optional)</span>
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
              {isLoading ? "Loading..." : "Select a machine..."}
            </option>
            {machines?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
            placeholder="Machine name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMachine.isPending || !newName.trim()}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {createMachine.isPending ? "..." : "Add"}
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
