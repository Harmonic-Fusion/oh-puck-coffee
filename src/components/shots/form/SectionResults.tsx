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
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 rounded-lg border-2 border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-red-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-red-400"
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
