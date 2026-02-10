"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { CheckboxGroup } from "@/components/common/CheckboxGroup";
import { RadioGroup } from "@/components/common/RadioGroup";
import { Input } from "@/components/common/Input";
import { FLAVOR_PROFILES } from "@/shared/shots/constants";
import { BODY_ADJECTIVES } from "@/shared/flavor-wheel/constants";
import { TOOLS } from "@/shared/equipment/constants";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionResults() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const handleClear = () => {
    setValue("shotQuality", undefined as unknown as number, { shouldValidate: false });
    setValue("flavorProfile", [], { shouldValidate: false });
    setValue("flavorWheelBody", undefined, { shouldValidate: false });
    setValue("toolsUsed", [], { shouldValidate: false });
    setValue("notes", "", { shouldValidate: false });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <Controller
        name="shotQuality"
        control={control}
        render={({ field }) => (
          <Slider
            label="Shot Quality"
            value={field.value || 1}
            onChange={field.onChange}
            min={1}
            max={10}
            step={1}
            error={errors.shotQuality?.message}
          />
        )}
      />

      <Controller
        name="flavorProfile"
        control={control}
        render={({ field }) => (
          <CheckboxGroup
            label="Flavor Profile"
            options={FLAVOR_PROFILES}
            value={field.value || []}
            onChange={field.onChange}
            columns={3}
          />
        )}
      />

      <Controller
        name="flavorWheelBody"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="Body"
            name="flavorWheelBody"
            options={BODY_ADJECTIVES}
            value={field.value || ""}
            onChange={field.onChange}
            columns={3}
          />
        )}
      />

      <Controller
        name="toolsUsed"
        control={control}
        render={({ field }) => (
          <CheckboxGroup
            label="Tools Used"
            options={TOOLS}
            value={field.value || []}
            onChange={field.onChange}
            columns={2}
          />
        )}
      />

      <Input
        label="Notes"
        placeholder="Any additional observations..."
        error={errors.notes?.message}
        {...register("notes")}
      />
    </section>
  );
}
