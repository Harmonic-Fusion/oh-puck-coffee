"use client";

import { useFormContext, Controller } from "react-hook-form";
import { BeanSelector } from "@/components/beans/BeanSelector";
import { GrinderSelector } from "@/components/equipment/GrinderSelector";
import { MachineSelector } from "@/components/equipment/MachineSelector";
import { ToolSelector } from "@/components/equipment/ToolSelector";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionBasics() {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const handleClear = () => {
    setValue("beanId", "", { shouldValidate: false });
    setValue("grinderId", "", { shouldValidate: false });
    setValue("machineId", undefined, { shouldValidate: false });
    setValue("toolsUsed", [], { shouldValidate: false });
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Setup
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 rounded-lg border-2 border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-red-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <BeanSelector
        value={watch("beanId") || ""}
        onChange={(v) => setValue("beanId", v, { shouldValidate: true })}
        error={errors.beanId?.message}
      />

      <GrinderSelector
        value={watch("grinderId") || ""}
        onChange={(v) => setValue("grinderId", v, { shouldValidate: true })}
        error={errors.grinderId?.message}
      />

      <MachineSelector
        value={watch("machineId") || ""}
        onChange={(v) =>
          setValue("machineId", v || undefined, { shouldValidate: true })
        }
        error={errors.machineId?.message}
      />

      <Controller
        name="toolsUsed"
        control={control}
        render={({ field }) => (
          <ToolSelector
            value={field.value || []}
            onChange={field.onChange}
          />
        )}
      />
    </section>
  );
}
