"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionResults() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CreateShot>();

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
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
            max={5}
            step={0.5}
            error={errors.shotQuality?.message}
          />
        )}
      />

      <Textarea
        label="Notes"
        placeholder="Any additional observations..."
        error={errors.notes?.message}
        rows={4}
        {...register("notes")}
      />
    </section>
  );
}
