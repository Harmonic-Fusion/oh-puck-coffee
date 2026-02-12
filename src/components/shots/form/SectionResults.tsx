"use client";

import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionResults() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const dose = watch("doseGrams");
  const yieldActual = watch("yieldActualGrams");
  const brewTime = watch("brewTimeSecs");

  // Calculate ratio for actual yield
  const actualRatio = dose && yieldActual ? (yieldActual / dose).toFixed(2) : null;
  
  // Calculate flow rate (g/s) from actual yield and brew time
  const flowRate = yieldActual && brewTime ? (yieldActual / brewTime).toFixed(2) : null;

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
      </div>

      <Controller
        name="yieldActualGrams"
        control={control}
        render={({ field }) => (
          <NumberStepper
            label="Actual Yield"
            suffix="g"
            secondarySuffix={actualRatio ? `1:${actualRatio}` : undefined}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            min={0}
            max={200}
            step={0.5}
            placeholder="—"
            error={errors.yieldActualGrams?.message}
          />
        )}
      />

      <Controller
        name="brewTimeSecs"
        control={control}
        render={({ field }) => (
          <NumberStepper
            label="Brew Time"
            suffix="sec"
            secondarySuffix={flowRate ? `${flowRate} g/s` : undefined}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            min={0}
            max={120}
            step={1}
            placeholder="—"
            error={errors.brewTimeSecs?.message}
            noRound={true}
          />
        )}
      />

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
            labels={{
              1: "Severe channeling/spraying",
              2: "Severe channeling/spraying",
              3: "Channeling detected",
              4: "Good - Minor unevenness",
              5: "Excellent - Even extraction",
            }}
          />
        )}
      />

      <Controller
        name="rating"
        control={control}
        render={({ field }) => (
          <Slider
            label="Rating"
            value={field.value || 1}
            onChange={field.onChange}
            min={1}
            max={5}
            step={0.5}
            error={errors.rating?.message}
            labels={{
              1: "Didn't enjoy",
              2: "Somewhat enjoyed",
              3: "Enjoyed",
              4: "Really enjoyed",
              5: "Loved it",
            }}
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
