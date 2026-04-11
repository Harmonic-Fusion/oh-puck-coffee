"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormContext, Controller } from "react-hook-form";
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { ToolSelector } from "@/components/equipment/ToolSelector";
import { ShotEquipmentPicker } from "./ShotEquipmentPicker";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";
import {
  useGrinders,
  useMachines,
  useTools,
  useExtraGearList,
} from "@/components/equipment/hooks";
import {
  buildAllGearCollectionEntries,
  foldExtraGearQueries,
} from "@/components/equipment/gear-collection-builders";
import { USER_GEAR_EXTRA_TYPES } from "@/shared/equipment/schema";
import { syncPrimaryGrinderMachineFromEquipmentIds } from "@/lib/shot-equipment-refs";

function EquipmentHeader({ onLinkClick }: { onLinkClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
        Equipment
      </h2>
      <Link
        href={`${AppRoutes.resources.shotLog.path}#Equipment`}
        target="_blank"
        aria-label="Equipment guide"
        onClick={onLinkClick}
        className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}

function summarizeEquipmentSelection(
  equipmentIds: string[] | undefined,
  idToName: Map<string, string>,
  toolsCatalog: { slug: string; name: string }[] | undefined,
  toolsUsed: string[] | undefined,
): string | null {
  const parts: string[] = [];
  for (const id of equipmentIds ?? []) {
    parts.push(idToName.get(id) ?? "Gear");
  }
  if (toolsUsed?.length && toolsCatalog?.length) {
    const names = toolsUsed
      .map((slug) => toolsCatalog.find((t) => t.slug === slug)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length) parts.push(names.join(", "));
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function SectionSetup() {
  const router = useRouter();
  const { setValue, watch, control, getValues } = useFormContext<CreateShot>();

  const equipmentIds = watch("equipmentIds") ?? [];
  const toolsUsed = watch("toolsUsed");
  const { data: grinders } = useGrinders();
  const { data: machines } = useMachines();
  const { data: toolsCatalog } = useTools();
  const myKettles = useExtraGearList("kettle");
  const myScales = useExtraGearList("scale");
  const myPourOver = useExtraGearList("pour_over");
  const myFrenchPress = useExtraGearList("french_press");
  const myMokaPot = useExtraGearList("moka_pot");
  const myColdBrew = useExtraGearList("cold_brew");

  const { byType: extraMineByType } = useMemo(
    () =>
      foldExtraGearQueries({
        kettle: myKettles,
        scale: myScales,
        pour_over: myPourOver,
        french_press: myFrenchPress,
        moka_pot: myMokaPot,
        cold_brew: myColdBrew,
      }),
    [
      myKettles,
      myScales,
      myPourOver,
      myFrenchPress,
      myMokaPot,
      myColdBrew,
    ],
  );

  const gearIdToName = useMemo(() => {
    const entries = buildAllGearCollectionEntries(
      grinders,
      machines,
      extraMineByType,
    );
    return new Map(entries.map((e) => [e.item.id, e.item.name]));
  }, [grinders, machines, extraMineByType]);

  const grinderIdSet = useMemo(
    () => new Set((grinders ?? []).map((g) => g.id)),
    [grinders],
  );
  const machineIdSet = useMemo(
    () => new Set((machines ?? []).map((m) => m.id)),
    [machines],
  );

  const hasAnyGearLoaded =
    (grinders?.length ?? 0) > 0 ||
    (machines?.length ?? 0) > 0 ||
    USER_GEAR_EXTRA_TYPES.some((t) => (extraMineByType[t]?.length ?? 0) > 0);

  useEffect(() => {
    if (equipmentIds.length > 0 && !hasAnyGearLoaded) {
      return;
    }
    const { grinderId, machineId } = syncPrimaryGrinderMachineFromEquipmentIds(
      equipmentIds,
      grinderIdSet,
      machineIdSet,
    );
    const cur = getValues();
    if (cur.grinderId !== grinderId) {
      setValue("grinderId", grinderId, { shouldValidate: true });
    }
    if (cur.machineId !== machineId) {
      setValue("machineId", machineId, { shouldValidate: true });
    }
  }, [
    equipmentIds,
    grinderIdSet,
    machineIdSet,
    getValues,
    setValue,
    hasAnyGearLoaded,
  ]);

  const selectionSummary = useMemo(
    () =>
      summarizeEquipmentSelection(
        equipmentIds,
        gearIdToName,
        toolsCatalog,
        toolsUsed,
      ),
    [equipmentIds, gearIdToName, toolsCatalog, toolsUsed],
  );

  const [isExpanded, setIsExpanded] = useState(false);

  const summaryText = selectionSummary ?? "Expand to Edit";

  return (
    <Card>
      <section id="equipment" className="space-y-6">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-label="Expand equipment"
          >
            <EquipmentHeader onLinkClick={(e) => e.stopPropagation()} />
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-base text-stone-700 dark:text-stone-300">
                {summaryText}
              </span>
              <ChevronDownIcon className="h-5 w-5 shrink-0 text-stone-400" />
            </div>
          </button>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex w-full items-center justify-between gap-2 text-left rounded-lg p-1 -m-1 hover:bg-stone-100 dark:hover:bg-stone-800/50"
              aria-label="Collapse equipment"
            >
              <EquipmentHeader onLinkClick={(e) => e.stopPropagation()} />
              <ChevronUpIcon className="h-5 w-5 text-stone-400 shrink-0" />
            </button>
            <div className="space-y-6">
              <div>
                <span className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200">
                  Brew gear
                </span>
                <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
                  Add any items from your collection. Your first grinder and first machine in the list
                  are used for recipe fields (e.g. grind level).
                </p>
                <Controller
                  name="equipmentIds"
                  control={control}
                  render={({ field }) => (
                    <ShotEquipmentPicker
                      id="shot-equipment"
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Controller
                name="toolsUsed"
                control={control}
                render={({ field }) => (
                  <ToolSelector
                    value={field.value || []}
                    onChange={field.onChange}
                    hideEmptyStateEquipmentLink
                  />
                )}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push(AppRoutes.equipment.path)}
              >
                Manage equipment
              </Button>
            </div>
          </div>
        )}
      </section>
    </Card>
  );
}
