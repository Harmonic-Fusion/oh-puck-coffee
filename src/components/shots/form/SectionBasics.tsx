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

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
        Setup
      </h2>

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
