"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { BeanSelector } from "@/components/beans/BeanSelector";
import { GrinderSelector } from "@/components/equipment/GrinderSelector";
import { MachineSelector } from "@/components/equipment/MachineSelector";
import { Card } from "@/components/common/Card";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionBasics() {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  return (
    <Card>
      <section id="setup" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
              Setup
            </h2>
            <Link
              href={`${AppRoutes.resources.shotLog.path}#Setup`}
              target="_blank"
              aria-label="Setup guide"
              className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <BeanSelector
          value={watch("beanId") || ""}
          onChange={(v) => setValue("beanId", v, { shouldValidate: true })}
          error={errors.beanId?.message}
          id="beanId"
        />

        <GrinderSelector
          value={watch("grinderId") || ""}
          onChange={(v) => setValue("grinderId", v || undefined, { shouldValidate: true })}
          error={errors.grinderId?.message}
          id="grinderId"
        />

        <MachineSelector
          value={watch("machineId") || ""}
          onChange={(v) =>
            setValue("machineId", v || undefined, { shouldValidate: true })
          }
          error={errors.machineId?.message}
          id="machineId"
        />
      </section>
    </Card>
  );
}
