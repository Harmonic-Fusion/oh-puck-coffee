"use client";

import { useMemo } from "react";
import { useGrinders } from "./hooks";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { SPECIAL_GRINDERS, isSpecialGrinder } from "@/shared/equipment/constants";

interface GrinderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}

export function GrinderSelector({
  value,
  onChange,
  error,
  id,
}: GrinderSelectorProps) {
  const { data: grinders, isLoading } = useGrinders();

  const options = useMemo(() => {
    if (!grinders) return [];

    const special: typeof grinders = [];
    const regular: typeof grinders = [];

    for (const grinder of grinders) {
      if (isSpecialGrinder(grinder.name)) {
        special.push(grinder);
      } else {
        regular.push(grinder);
      }
    }

    special.sort((a, b) => {
      const aIndex = SPECIAL_GRINDERS.indexOf(a.name as (typeof SPECIAL_GRINDERS)[number]);
      const bIndex = SPECIAL_GRINDERS.indexOf(b.name as (typeof SPECIAL_GRINDERS)[number]);
      return aIndex - bIndex;
    });

    regular.sort((a, b) => a.name.localeCompare(b.name));

    return [...special, ...regular].map((g) => ({
      value: g.id,
      label: g.name,
      thumbnailBase64: g.thumbnailBase64,
    }));
  }, [grinders]);

  return (
    <div className="w-full">
      <label
        className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200"
        tabIndex={-1}
      >
        Grinder
      </label>
      {!isLoading && options.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center dark:border-stone-600 dark:bg-stone-900/40">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have any grinders in your collection yet.
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={value}
              onChange={onChange}
              options={options}
              placeholder="Select a grinder..."
              isLoading={isLoading}
              error={error}
              emptyMessage="No grinders match your search"
              id={id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
