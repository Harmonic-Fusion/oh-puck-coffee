"use client";

import {
  FLAVOR_WHEEL,
  type FlavorWheelCategory,
} from "@/shared/flavor-wheel/constants";
import { FlavorCategory } from "./FlavorCategory";

interface FlavorWheelProps {
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
}

export function FlavorWheel({ value, onChange }: FlavorWheelProps) {
  const categories = Object.keys(FLAVOR_WHEEL) as FlavorWheelCategory[];

  const handleCategoryChange = (
    category: string,
    categoryFlavors: Record<string, string[]>
  ) => {
    const newValue = { ...value };

    // Remove all keys that belong to this category's subcategories
    const subcategories = Object.keys(
      FLAVOR_WHEEL[category as FlavorWheelCategory]
    );
    for (const sub of subcategories) {
      const key = `${category}:${sub}`;
      delete newValue[key];
    }

    // Add back the selected ones
    for (const [sub, flavors] of Object.entries(categoryFlavors)) {
      if (flavors.length > 0) {
        newValue[`${category}:${sub}`] = flavors;
      }
    }

    onChange(newValue);
  };

  const getCategorySelected = (
    category: string
  ): Record<string, string[]> => {
    const selected: Record<string, string[]> = {};
    const subcategories = Object.keys(
      FLAVOR_WHEEL[category as FlavorWheelCategory]
    );
    for (const sub of subcategories) {
      const key = `${category}:${sub}`;
      if (value[key] && value[key].length > 0) {
        selected[sub] = value[key];
      }
    }
    return selected;
  };

  return (
    <div className="space-y-2">
      <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
        SCA Flavor Wheel
      </span>
      {categories.map((category) => (
        <FlavorCategory
          key={category}
          category={category}
          subcategories={
            FLAVOR_WHEEL[category] as unknown as Record<
              string,
              readonly string[]
            >
          }
          selectedFlavors={getCategorySelected(category)}
          onChange={(flavors) => handleCategoryChange(category, flavors)}
        />
      ))}
    </div>
  );
}
