"use client";

import { useState } from "react";
import { useTools, useCreateTool } from "./hooks";

interface ToolSelectorProps {
  /** Array of tool slugs currently selected */
  value: string[];
  onChange: (slugs: string[]) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ToolSelector({ value, onChange }: ToolSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: tools, isLoading } = useTools();
  const createTool = useCreateTool();

  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const tool = await createTool.mutateAsync({
        name: trimmed,
        slug: slugify(trimmed),
        description: newDescription.trim() || undefined,
      });
      // Auto-select the newly created tool
      onChange([...value, tool.slug]);
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="w-full">
      <span className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
        Tools Used
      </span>

      {isLoading ? (
        <p className="text-xs text-stone-400">Loading tools…</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {tools?.map((tool) => {
            const checked = value.includes(tool.slug);
            return (
              <label
                key={tool.slug}
                className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(tool.slug)}
                  className="h-5 w-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700 dark:text-stone-300">
                  {tool.name}
                </span>
                {/* Tooltip */}
                {tool.description && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-stone-800 px-3 py-2 text-xs leading-relaxed text-stone-100 shadow-lg group-hover:block dark:bg-stone-700">
                    {tool.description}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800 dark:border-t-stone-700" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* + New button at bottom */}
      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          tabIndex={-1}
          className="mt-2 rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-stone-600 dark:text-stone-400 dark:hover:border-amber-600 dark:hover:text-amber-400"
        >
          + New Tool
        </button>
      ) : (
        <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <input
            type="text"
            placeholder="Tool name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <input
            type="text"
            placeholder="Short description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createTool.isPending || !newName.trim()}
              tabIndex={-1}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {createTool.isPending ? "..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setNewDescription("");
              }}
              tabIndex={-1}
              className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
