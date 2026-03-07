"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { GrinderSelector } from "@/components/equipment/GrinderSelector";
import { MachineSelector } from "@/components/equipment/MachineSelector";
import { Card } from "@/components/common/Card";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";
import { useGrinders, useMachines } from "@/components/equipment/hooks";

function SetupHeader({ onLinkClick }: { onLinkClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
        Setup
      </h2>
      <Link
        href={`${AppRoutes.resources.shotLog.path}#Setup`}
        target="_blank"
        aria-label="Setup guide"
        onClick={onLinkClick}
        className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}

export function SectionSetup() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const grinderId = watch("grinderId");
  const machineId = watch("machineId");
  const { data: grinders } = useGrinders();
  const { data: machines } = useMachines();

  // Find grinder and machine names
  const grinderName = useMemo(() => {
    if (!grinderId || !grinders) return null;
    return grinders.find((g) => g.id === grinderId)?.name ?? null;
  }, [grinderId, grinders]);

  const machineName = useMemo(() => {
    if (!machineId || !machines) return null;
    return machines.find((m) => m.id === machineId)?.name ?? null;
  }, [machineId, machines]);

  const [isExpanded, setIsExpanded] = useState(false);

  const hasEquipment = grinderName || machineName;
  const summaryText = hasEquipment
    ? [grinderName, machineName].filter(Boolean).join(" · ")
    : "Expand to Edit";

  return (
    <Card>
      <section id="setup" className="space-y-6">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-label="Expand setup"
          >
            <SetupHeader onLinkClick={(e) => e.stopPropagation()} />
            <div className="flex items-center gap-2">
              <span className="text-base text-stone-700 dark:text-stone-300">
                {summaryText}
              </span>
              <ChevronDownIcon className="h-5 w-5 text-stone-400" />
            </div>
          </button>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex w-full items-center justify-between gap-2 text-left rounded-lg p-1 -m-1 hover:bg-stone-100 dark:hover:bg-stone-800/50"
              aria-label="Collapse setup"
            >
              <SetupHeader onLinkClick={(e) => e.stopPropagation()} />
              <ChevronUpIcon className="h-5 w-5 text-stone-400 shrink-0" />
            </button>
            <div className="space-y-6">
              <GrinderSelector
                value={grinderId || ""}
                onChange={(v) => setValue("grinderId", v || undefined, { shouldValidate: true })}
                error={errors.grinderId?.message}
                id="grinderId"
              />
              <MachineSelector
                value={machineId || ""}
                onChange={(v) =>
                  setValue("machineId", v || undefined, { shouldValidate: true })
                }
                error={errors.machineId?.message}
                id="machineId"
              />
            </div>
          </div>
        )}
      </section>
    </Card>
  );
}
