"use client";

import Link from "next/link";
import { useTools } from "./hooks";
import { AppRoutes } from "@/app/routes";

interface ToolSelectorProps {
  /** Array of tool slugs currently selected */
  value: string[];
  onChange: (slugs: string[]) => void;
  /** Hide the "Tools Used" label */
  hideLabel?: boolean;
  /** When true, empty state has no link to My Equipment (e.g. shot log uses Setup’s button) */
  hideEmptyStateEquipmentLink?: boolean;
}

export function ToolSelector({
  value,
  onChange,
  hideLabel = false,
  hideEmptyStateEquipmentLink = false,
}: ToolSelectorProps) {
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
      ) : !tools || tools.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center dark:border-stone-600 dark:bg-stone-900/40">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have any tools in your collection yet.
          </p>
          {!hideEmptyStateEquipmentLink && (
            <Link
              href={AppRoutes.equipment.path}
              className="mt-3 inline-block text-sm font-medium text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Add tools on My Equipment
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {tools.map((tool) => {
              const checked = value.includes(tool.slug);
              return (
                <label
                  key={tool.slug}
                  className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-colors ${
                    checked
                      ? "bg-amber-50 dark:bg-amber-950/35"
                      : "hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(tool.slug)}
                    className="h-5 w-5 shrink-0 rounded border-stone-300 accent-amber-600 focus:ring-amber-500 dark:border-stone-600 dark:accent-amber-500"
                  />
                  <span className="text-stone-700 dark:text-stone-300">
                    {tool.name}
                  </span>
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
        </>
      )}
    </div>
  );
}
