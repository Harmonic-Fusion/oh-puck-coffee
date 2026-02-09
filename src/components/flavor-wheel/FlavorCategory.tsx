"use client";

import { useState } from "react";

interface FlavorCategoryProps {
  category: string;
  subcategories: Record<string, readonly string[]>;
  selectedFlavors: Record<string, string[]>;
  onChange: (categoryFlavors: Record<string, string[]>) => void;
}

export function FlavorCategory({
  category,
  subcategories,
  selectedFlavors,
  onChange,
}: FlavorCategoryProps) {
  const [expanded, setExpanded] = useState(false);

  const totalSelected = Object.values(selectedFlavors).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const toggleFlavor = (subcategory: string, flavor: string) => {
    const current = selectedFlavors[subcategory] || [];
    const updated = current.includes(flavor)
      ? current.filter((f) => f !== flavor)
      : [...current, flavor];

    const newFlavors = { ...selectedFlavors };
    if (updated.length > 0) {
      newFlavors[subcategory] = updated;
    } else {
      delete newFlavors[subcategory];
    }
    onChange(newFlavors);
  };

  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <span className="flex items-center gap-2">
          {category}
          {totalSelected > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {totalSelected}
            </span>
          )}
        </span>
        <span className="text-stone-400">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-700">
          {Object.entries(subcategories).map(([sub, flavors]) => (
            <div key={sub} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {sub}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {flavors.map((flavor) => {
                  const isSelected = (
                    selectedFlavors[sub] || []
                  ).includes(flavor);
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => toggleFlavor(sub, flavor)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        isSelected
                          ? "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800"
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
