"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/common/Input";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionRecipe() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const dose = watch("doseGrams");
  const yieldG = watch("yieldGrams");
  const time = watch("brewTimeSecs");

  const ratio = dose && yieldG ? (yieldG / dose).toFixed(2) : "—";
  const flow = yieldG && time ? (yieldG / time).toFixed(2) : "—";

  const handleClear = () => {
    setValue("doseGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("yieldGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("grindLevel", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTimeSecs", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTempC", undefined, { shouldValidate: false });
    setValue("preInfusionDuration", undefined, { shouldValidate: false });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          Recipe
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Input
          label="Dose (g)"
          type="number"
          step="0.1"
          placeholder="18.0"
          error={errors.doseGrams?.message}
          {...register("doseGrams")}
        />

        <Input
          label="Yield (g)"
          type="number"
          step="0.1"
          placeholder="36.0"
          error={errors.yieldGrams?.message}
          {...register("yieldGrams")}
        />

        <Input
          label="Grind Level"
          type="number"
          step="0.1"
          placeholder="2.5"
          error={errors.grindLevel?.message}
          {...register("grindLevel")}
        />

        <Input
          label="Brew Time (sec)"
          type="number"
          step="0.1"
          placeholder="28.0"
          error={errors.brewTimeSecs?.message}
          {...register("brewTimeSecs")}
        />

        <Input
          label="Brew Temp (°C)"
          type="number"
          step="0.1"
          placeholder="93.5"
          error={errors.brewTempC?.message}
          {...register("brewTempC")}
        />

        <Input
          label="Pre-infusion (sec)"
          type="number"
          step="0.1"
          placeholder="5.0"
          hint="Optional"
          error={errors.preInfusionDuration?.message}
          {...register("preInfusionDuration")}
        />
      </div>

      {/* Computed preview */}
      <div className="flex gap-6 rounded-lg bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
        <div>
          <span className="text-stone-500 dark:text-stone-400">Ratio: </span>
          <span className="font-medium text-stone-800 dark:text-stone-200">
            1:{ratio}
          </span>
        </div>
        <div>
          <span className="text-stone-500 dark:text-stone-400">
            Flow Rate:{" "}
          </span>
          <span className="font-medium text-stone-800 dark:text-stone-200">
            {flow} g/s
          </span>
        </div>
      </div>
    </section>
  );
}
