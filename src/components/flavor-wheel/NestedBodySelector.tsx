"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { BODY_SELECTOR_DATA } from "@/shared/flavor-wheel";
import { getBodyColor, increaseOpacity } from "@/shared/flavor-wheel/colors";
import { SelectedBadges } from "./SelectedBadges";
import { InfoTooltip } from "@/components/common/InfoTooltip";

type BodyCategory = "light" | "medium" | "heavy";

interface NestedBodySelectorProps {
  value: string[]; // Array of paths like ["Light", "Light:Watery"]
  onChange: (value: string[]) => void;
}

/**
 * Nested Body Selector component with two levels:
 * - Top level: Light, Medium, Heavy
 * - Second level: Specific body descriptors (expandable with + button)
 * 
 * Stores:
 * - Category only: ["Light"] when category is selected
 * - Descriptor only: ["Light:Watery"] when descriptor is selected
 */
export function NestedBodySelector({
  value,
  onChange,
}: NestedBodySelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<BodyCategory>>(new Set());

  // Parse current selection - value now contains category and/or descriptor
  // Format: ["Light"] for category only, or ["Light", "Watery"] for category + descriptor
  const selectedCategory = value.length > 0 && ["light", "medium", "heavy"].includes(value[0].toLowerCase())
    ? value[0].toLowerCase() as BodyCategory
    : null;
  const selectedDescriptor = value.length > 1 ? value[1] : null;
  const selectedName = selectedDescriptor || selectedCategory || null;
  
  // Find which category the descriptor belongs to (if we have a descriptor but no category)
  const selectedDescriptorCategory = selectedDescriptor && !selectedCategory
    ? (() => {
        // Find which category this descriptor belongs to
        for (const [cat, descriptors] of Object.entries(BODY_SELECTOR_DATA)) {
          if (descriptors.some((d: string) => d.toLowerCase() === selectedDescriptor.toLowerCase())) {
            return cat as BodyCategory;
          }
        }
        return null;
      })()
    : selectedCategory;

  const handleCategorySelect = (category: BodyCategory) => {
    // If clicking the same category, deselect it
    if (selectedCategory === category) {
      onChange([]);
    } else {
      // Select just the category name (e.g., ["Light"])
      onChange([category]);
    }
  };

  const handleDescriptorSelect = (category: BodyCategory, descriptor: string) => {
    // Store both the category and descriptor (all ancestors + selected)
    // If clicking the same descriptor, deselect it
    if (selectedDescriptor && selectedDescriptor.toLowerCase() === descriptor.toLowerCase()) {
      onChange([]);
    } else {
      // Select both category and descriptor (e.g., ["Light", "Watery"])
      onChange([category, descriptor]);
    }
  };

  const handleToggleExpand = (category: BodyCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleExpandAll = () => {
    setExpandedCategories(new Set(["light", "medium", "heavy"]));
  };

  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
  };

  const allExpanded = expandedCategories.size === 3;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Body / Texture
          </span>
          <InfoTooltip
            helpText="Select one level for your coffee, closest to how it feels in your mouth"
            ariaLabel="Body / Texture help"
          />
        </div>
        <button
          type="button"
          onClick={allExpanded ? handleCollapseAll : handleExpandAll}
          className="h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>
      <div className="space-y-3 flex flex-col items-end w-full">
        {(["light", "medium", "heavy"] as BodyCategory[]).map((category) => {
          const isCategorySelected = selectedCategory === category;
          const descriptors = BODY_SELECTOR_DATA[category];
          const color = getBodyColor(category);
          // Check if any descriptor from this category is selected
          const isDescriptorInCategory = selectedDescriptor && selectedDescriptorCategory === category;
          const hasSelectedDescriptor = isDescriptorInCategory;

          return (
            <div
              key={category}
              className="rounded-lg border-2 transition-colors w-full"
              style={{
                borderColor: isCategorySelected || hasSelectedDescriptor || isDescriptorInCategory ? "white" : "transparent",
                backgroundColor: isCategorySelected || hasSelectedDescriptor || isDescriptorInCategory
                  ? increaseOpacity(color, 0.6) // Increase opacity when selected
                  : color,
              }}
            >
              {/* Category Level */}
              <div
                onClick={() => handleCategorySelect(category)}
                className={`flex items-center gap-3 rounded-t-lg px-4 h-16 capitalize transition-colors cursor-pointer ${
                  isCategorySelected
                    ? "font-bold text-white"
                    : "font-semibold text-stone-900 dark:text-stone-100"
                }`}
              >
                <span className="flex-1">{category}</span>
                <button
                  type="button"
                  onClick={(e) => handleToggleExpand(category, e)}
                  className={`flex-shrink-0 h-16 w-16 flex items-center justify-center transition-colors ${
                    isCategorySelected 
                      ? "text-white hover:bg-white/20" 
                      : "text-stone-700 hover:bg-stone-200/50 dark:text-stone-300 dark:hover:bg-stone-700/50"
                  }`}
                  aria-label={expandedCategories.has(category) ? "Collapse" : "Expand"}
                >
                  {expandedCategories.has(category) ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Descriptors Level - Visible when expanded */}
              {expandedCategories.has(category) && (
                <div className="border-t-2 px-4 py-3" style={{ borderColor: "rgba(255, 255, 255, 0.3)" }}>
                  <div className="flex flex-col gap-2">
                    {descriptors.map((descriptor) => {
                      // Check if this descriptor is selected
                      const isDescriptorSelected = selectedDescriptor && 
                        descriptor.toLowerCase() === selectedDescriptor.toLowerCase();

                      return (
                        <button
                          key={descriptor}
                          type="button"
                          onClick={() => handleDescriptorSelect(category, descriptor)}
                          className={`w-full rounded-md border-2 px-3 py-2 text-sm text-left transition-colors ${
                            isDescriptorSelected
                              ? "font-bold text-white border-white"
                              : "font-medium text-stone-900 dark:text-stone-100 border-transparent"
                          }`}
                          style={{
                            backgroundColor: isDescriptorSelected
                              ? "rgba(255, 255, 255, 0.3)"
                              : "rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          {descriptor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedName && (
        <SelectedBadges
          title="Selected Body"
          items={[
            {
              label: selectedDescriptor || selectedCategory || "",
              color: getBodyColor(
                selectedCategory || selectedDescriptorCategory || "light"
              ),
              key: selectedName,
              className: "capitalize",
            },
          ]}
          onClear={() => onChange([])}
        />
      )}
    </div>
  );
}
