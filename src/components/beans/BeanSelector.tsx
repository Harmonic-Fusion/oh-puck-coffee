"use client";

import { useState } from "react";
import { useBeans, useCreateBean } from "./hooks";
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";

interface BeanSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function BeanSelector({ value, onChange, error }: BeanSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newRoaster, setNewRoaster] = useState("");
  const [newProcessing, setNewProcessing] = useState("");
  const [newRoast, setNewRoast] = useState<string>(ROAST_LEVELS[2]);
  const [newRoastDate, setNewRoastDate] = useState("");

  const { data: beans, isLoading } = useBeans();
  const createBean = useCreateBean();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const bean = await createBean.mutateAsync({
        name: newName.trim(),
        origin: newOrigin.trim() || undefined,
        roaster: newRoaster.trim() || undefined,
        processingMethod: newProcessing
          ? (newProcessing as (typeof PROCESSING_METHODS)[number])
          : undefined,
        roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
        roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
      });
      onChange(bean.id);
      setShowCreate(false);
      setNewName("");
      setNewOrigin("");
      setNewRoaster("");
      setNewProcessing("");
      setNewRoastDate("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200">
        Bean
      </label>
      {!showCreate ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`h-14 flex-1 rounded-xl border-2 px-4 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
              error
                ? "border-red-400"
                : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            }`}
          >
            <option value="">
              {isLoading ? "Loading..." : "Select a bean..."}
            </option>
            {beans?.map((bean) => (
              <option key={bean.id} value={bean.id}>
                {bean.name} ({bean.roastLevel})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-14 rounded-xl border-2 border-stone-300 px-4 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            + New
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <input
            type="text"
            placeholder="Bean name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Origin"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            />
            <input
              type="text"
              placeholder="Roaster"
              value={newRoaster}
              onChange={(e) => setNewRoaster(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newProcessing}
              onChange={(e) => setNewProcessing(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">Processing...</option>
              {PROCESSING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <select
              value={newRoast}
              onChange={(e) => setNewRoast(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              {ROAST_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newRoastDate}
              onChange={(e) => setNewRoastDate(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              placeholder="Roast date"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createBean.isPending || !newName.trim()}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {createBean.isPending ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
