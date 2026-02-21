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

interface ValidationBannerProps {
  errors: FieldErrors;
}

export function ValidationBanner({ errors }: ValidationBannerProps) {
  const errorKeys = Object.keys(errors).filter((key) => key !== "root");
  if (errorKeys.length === 0) return null;

  const missingFields = errorKeys.map(
    (key) => FIELD_LABELS[key] ?? key
  );

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg">⚠️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Please fix the following before submitting:
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            {missingFields.map((field) => (
              <li
                key={field}
                className="text-sm text-red-700 dark:text-red-400"
              >
                {field}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
