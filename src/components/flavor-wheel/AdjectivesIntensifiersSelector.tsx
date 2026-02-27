"use client";

import { ADJECTIVES_INTENSIFIERS_DATA, getAdjectiveColor } from "@/shared/flavor-wheel";
import { SelectedBadges } from "./SelectedBadges";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface AdjectivesIntensifiersSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Adjectives and Intensifiers Selector component
 * Displays rows with left/right pairs and allows multiple selections
 */
export function AdjectivesIntensifiersSelector({
  value,
  onChange,
}: AdjectivesIntensifiersSelectorProps) {
  const selectedSet = new Set(value);

  const handleToggle = (adjective: string) => {
    const newValue = selectedSet.has(adjective)
      ? value.filter((a) => a !== adjective)
      : [...value, adjective];
    onChange(newValue);
  };

  const handleToggleBox = (adjectives: string[]) => {
    const allSelected = adjectives.every((adj) => selectedSet.has(adj));
    if (allSelected) {
      // Deselect all in this box
      const newValue = value.filter((a) => !adjectives.includes(a));
      onChange(newValue);
    } else {
      // Select all in this box
      const newValue = [...new Set([...value, ...adjectives])];
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Adjectives & Intensifiers
        </span>
        <InfoTooltip
          helpText="Select multiple adjectives that describe your coffee. Each row shows opposite characteristics—choose what best matches your experience."
          ariaLabel="Adjectives & Intensifiers help"
        />
      </div>
      <div className="space-y-2">
        {ADJECTIVES_INTENSIFIERS_DATA.rows.map((row, rowIndex) => {
          const leftColor = row.left.color;
          const rightColor = row.right.color;

          return (
            <div
              key={rowIndex}
              className="grid grid-cols-2 gap-2 rounded-lg"
            >
              {/* Left Side */}
              <div 
                className="space-y-1.5 rounded-l-lg p-2 cursor-pointer"
                style={{
                  backgroundColor: leftColor,
                }}
                onClick={() => handleToggleBox(row.left.items)}
              >
                <div className="flex flex-wrap gap-1">
                  {row.left.items.map((adjective) => {
                    const isSelected = selectedSet.has(adjective);
                    return (
                      <button
                        key={adjective}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(adjective);
                        }}
                        className={`rounded-md border-2 px-3 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? "font-bold text-white border-white"
                            : "font-medium text-stone-900 dark:text-stone-100 border-transparent"
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255, 255, 255, 0.3)"
                            : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {adjective}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side */}
              <div 
                className="space-y-1.5 rounded-r-lg p-2 cursor-pointer"
                style={{
                  backgroundColor: rightColor,
                }}
                onClick={() => handleToggleBox(row.right.items)}
              >
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {row.right.items.map((adjective) => {
                    const isSelected = selectedSet.has(adjective);
                    return (
                      <button
                        key={adjective}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(adjective);
                        }}
                        className={`rounded-md border-2 px-3 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? "font-bold text-white border-white"
                            : "font-medium text-stone-900 dark:text-stone-100 border-transparent"
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255, 255, 255, 0.3)"
                            : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {adjective}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <SelectedBadges
        title="Selected Adjectives"
        items={value.map((adjective) => ({
          label: adjective,
          color: getAdjectiveColor(adjective),
          key: adjective,
        }))}
        onClear={() => onChange([])}
        onReorder={(reorderedItems) => {
          // Map reordered badge items back to adjective names
          const reorderedNames = reorderedItems.map((item) => item.key || item.label);
          onChange(reorderedNames);
        }}
      />
    </div>
  );
}
