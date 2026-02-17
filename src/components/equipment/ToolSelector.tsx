"use client";

import { useTools } from "./hooks";

interface ToolSelectorProps {
  /** Array of tool slugs currently selected */
  value: string[];
  onChange: (slugs: string[]) => void;
  /** Hide the "Tools Used" label */
  hideLabel?: boolean;
}

export function ToolSelector({ value, onChange, hideLabel = false }: ToolSelectorProps) {
  const { data: tools, isLoading } = useTools();

  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  return (
    <div className="w-full">
      {!hideLabel && (
        <span className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
          Tools Used
        </span>
      )}

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
    </div>
  );
}
