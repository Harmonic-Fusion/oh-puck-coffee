"use client";

import { useFormContext } from "react-hook-form";
import { BeanSelector } from "@/components/beans/BeanSelector";
import { GrinderSelector } from "@/components/equipment/GrinderSelector";
import { MachineSelector } from "@/components/equipment/MachineSelector";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionBasics() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const handleClear = () => {
    setValue("beanId", "", { shouldValidate: false });
    setValue("grinderId", "", { shouldValidate: false });
    setValue("machineId", undefined, { shouldValidate: false });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          Setup
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <BeanSelector
        value={watch("beanId") || ""}
        onChange={(v) => setValue("beanId", v, { shouldValidate: true })}
        error={errors.beanId?.message}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </section>
  );
}
