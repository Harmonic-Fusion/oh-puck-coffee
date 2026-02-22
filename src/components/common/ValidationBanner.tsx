"use client";

import type { FieldErrors } from "react-hook-form";

/** Human-readable labels for form field names */
const FIELD_LABELS: Record<string, string> = {
  beanId: "Bean",
  grinderId: "Grinder",
  machineId: "Machine",
  doseGrams: "Dose",
  yieldGrams: "Target Yield",
  grindLevel: "Grind Level",
  brewTempC: "Brew Temperature",
  preInfusionDuration: "Pre-infusion Duration",
  brewPressure: "Brew Pressure",
  yieldActualGrams: "Actual Yield",
  brewTimeSecs: "Brew Time",
  shotQuality: "Shot Quality",
  rating: "Rating",
  notes: "Notes",
  flavors: "Flavors",
  bodyTexture: "Body Texture",
  adjectives: "Adjectives",
  toolsUsed: "Tools Used",
};

/** Map field names to their section IDs */
const FIELD_SECTIONS: Record<string, string> = {
  beanId: "setup",
  grinderId: "setup",
  machineId: "setup",
  doseGrams: "recipe",
  yieldGrams: "recipe",
  grindLevel: "recipe",
  brewTempC: "recipe",
  preInfusionDuration: "recipe",
  brewPressure: "recipe",
  toolsUsed: "recipe",
  yieldActualGrams: "results",
  brewTimeSecs: "results",
  estimateMaxPressure: "results",
  shotQuality: "results",
  rating: "results",
  notes: "results",
  flavors: "results",
  bodyTexture: "results",
  adjectives: "results",
};

function scrollToField(fieldKey: string) {
  const fieldId = fieldKey;
  const element = document.getElementById(fieldId);
  
  if (element) {
    // Scroll to the section first if it exists
    const sectionId = FIELD_SECTIONS[fieldKey];
    if (sectionId) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        // Small delay to let section scroll complete, then scroll to field
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Focus the element if it's focusable
          if (element instanceof HTMLElement && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.getAttribute("role") === "slider" || element.getAttribute("role") === "textbox")) {
            element.focus();
          }
        }, 300);
        return;
      }
    }
    
    // If no section, just scroll to the field
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus the element if it's focusable
    if (element instanceof HTMLElement && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.getAttribute("role") === "slider" || element.getAttribute("role") === "textbox")) {
      element.focus();
    }
  }
}

interface ValidationBannerProps {
  errors: FieldErrors;
}

export function ValidationBanner({ errors }: ValidationBannerProps) {
  const errorKeys = Object.keys(errors).filter((key) => key !== "root");
  if (errorKeys.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30"
    >
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-red-800 dark:text-red-300">
          Please fix these before submitting
        </p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5">
          {errorKeys.map((key) => {
            const fieldLabel = FIELD_LABELS[key] ?? key;
            return (
              <li
                key={key}
                className="text-lg text-red-700 dark:text-red-400"
              >
                <button
                  type="button"
                  onClick={() => scrollToField(key)}
                  className="underline hover:text-red-800 dark:hover:text-red-300"
                >
                  {fieldLabel}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
