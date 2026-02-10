"use client";

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { FlavorWheel } from "@/components/flavor-wheel/FlavorWheel";
import { RadioGroup } from "@/components/common/RadioGroup";
import { CheckboxGroup } from "@/components/common/CheckboxGroup";
import { BODY_ADJECTIVES, EXTRA_ADJECTIVES } from "@/shared/flavor-wheel/constants";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionFlavorWheel() {
  const [expanded, setExpanded] = useState(false);
  const { control, setValue, formState: { errors } } = useFormContext<CreateShot>();

  const handleClear = () => {
    setValue("flavorWheelCategories", undefined, { shouldValidate: false });
    setValue("flavorWheelBody", undefined, { shouldValidate: false });
    setValue("flavorWheelAdjectives", [], { shouldValidate: false });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center justify-between rounded-lg bg-stone-50 px-4 py-3 text-left transition-colors hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700"
        >
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            🎨 Describe flavors in detail?
          </h2>
          <span className="text-stone-400 dark:text-stone-500">
            {expanded ? "▲ Collapse" : "▼ Expand"}
          </span>
        </button>
        {expanded && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-6 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          {/* SCA Flavor Wheel */}
          <Controller
            name="flavorWheelCategories"
            control={control}
            render={({ field }) => (
              <FlavorWheel
                value={field.value || {}}
                onChange={field.onChange}
              />
            )}
          />

          {/* Body / Texture */}
          <Controller
            name="flavorWheelBody"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label="Body / Texture"
                name="flavorWheelBody_section4"
                options={BODY_ADJECTIVES}
                value={field.value || ""}
                onChange={field.onChange}
                columns={3}
                error={errors.flavorWheelBody?.message}
              />
            )}
          />

          {/* Additional Adjectives */}
          <Controller
            name="flavorWheelAdjectives"
            control={control}
            render={({ field }) => (
              <CheckboxGroup
                label="Additional Adjectives"
                options={[...EXTRA_ADJECTIVES]}
                value={field.value || []}
                onChange={field.onChange}
                columns={3}
              />
            )}
          />
        </div>
      )}
    </section>
  );
}
