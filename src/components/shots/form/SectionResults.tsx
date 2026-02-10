"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { Input } from "@/components/common/Input";
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
    setValue("notes", "", { shouldValidate: false });
  };

  return (
    <section className="space-y-6">
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

      <Input
        label="Notes"
        placeholder="Any additional observations..."
        error={errors.notes?.message}
        {...register("notes")}
      />
    </section>
  );
}
