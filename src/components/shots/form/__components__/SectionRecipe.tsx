"use client";

import { useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { BeanSection } from "./BeanSection";
import { EditInputsButton } from "./EditInputsButton";
import { CollapsibleSection } from "./CollapsibleSection";
import type { CreateShot } from "@/shared/shots/schema";
import { PreviousShotRow } from "./PreviousShotRow";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { useBeans } from "@/components/beans/hooks";
import { useGrinders } from "@/components/equipment/hooks";
import { isSpecialGrinder } from "@/shared/equipment/constants";
import { TEMP_UNIT_KEY, fToC, cToF } from "@/lib/format-numbers";
import { getRequiredStepIds, type ReorderableStepConfig } from "../step-config";
import { useReorderableSteps } from "../hooks/useReorderableSteps";

export type RecipeStepId =
  | "beans"
  | "previousShot"
  | "dose"
  | "yield"
  | "size"
  | "grindLevel"
  | "brewTemp"
  | "brewPressure"
  | "preInfusion";

export const DEFAULT_RECIPE_STEPS: ReorderableStepConfig<RecipeStepId>[] = [
  { id: "previousShot", label: "Previous Shot", description: "Reference your last shot's parameters", visible: true },
  { id: "beans", label: "Beans", description: "Select the coffee beans used", visible: true, required: true },
  { id: "grindLevel", label: "Grind Level", description: "Grind setting on your grinder (e.g. 15.5)", visible: false },
  { id: "dose", label: "Dose", description: "Amount of ground coffee in grams", visible: false },
  { id: "yield", label: "Target Yield", description: "Target espresso output weight in grams", visible: false },
  { id: "size", label: "Size", description: "Drink size in ounces (e.g. 2oz espresso)", visible: false },
  { id: "brewTemp", label: "Brew Temp", description: "Water temperature during extraction", visible: false },
  { id: "brewPressure", label: "Brew Pressure", description: "Target pump pressure in bars", visible: false },
  { id: "preInfusion", label: "Pre-infusion", description: "Low-pressure pre-wet before full extraction", visible: false },
];

export const REQUIRED_RECIPE_FIELDS: RecipeStepId[] =
  getRequiredStepIds(DEFAULT_RECIPE_STEPS);

const RATIO_OPTIONS = [1, 2, 3, 4] as const;
const DOSE_OPTIONS = [16, 18, 20, 22] as const;
const PRESSURE_OPTIONS = [6, 9, 12] as const;
const SIZE_OPTIONS = [2, 8, 12, 16, 20] as const;
const DEFAULT_BREW_TEMP_F = 200;

function getSavedTempUnit(): "C" | "F" {
  if (typeof window === "undefined") return "F";
  return (localStorage.getItem(TEMP_UNIT_KEY) as "C" | "F") || "F";
}

function subscribeTempUnit(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

interface SectionRecipeProps {
  previousShotId?: string | null;
  onViewShot?: (shot: ShotWithJoins) => void;
  showAllInputs?: boolean;
  onEditInputs?: () => void;
  steps: ReturnType<typeof useReorderableSteps<RecipeStepId>>;
}

export function SectionRecipe({
  previousShotId,
  onViewShot,
  showAllInputs = false,
  onEditInputs,
  steps,
}: SectionRecipeProps) {
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<CreateShot>();

  // ── Persisted temp-unit preference (useSyncExternalStore for hydration) ──
  const tempUnitFromStore = useSyncExternalStore(
    subscribeTempUnit,
    getSavedTempUnit,
    () => "F",
  );
  const [tempUnitOverride, setTempUnitOverride] = useState<"C" | "F" | null>(null);
  const tempUnit = tempUnitOverride ?? tempUnitFromStore;
  const [activeRatio, setActiveRatio] = useState<number | null>(null);
  const [activeDose, setActiveDose] = useState<number | null>(null);
  const [activePressure, setActivePressure] = useState<number | null>(9);
  const [activeSize, setActiveSize] = useState<number | null>(null);

  const brewTempC = watch("brewTempC");

  // Derive tempFValue during render (avoids setState in effect)
  const tempFValue =
    tempUnit === "F"
      ? brewTempC != null
        ? cToF(brewTempC)
        : DEFAULT_BREW_TEMP_F
      : undefined;

  // Set default brewTempC when unset
  useEffect(() => {
    if (brewTempC == null) {
      const defaultC = fToC(DEFAULT_BREW_TEMP_F);
      setValue("brewTempC", defaultC, { shouldValidate: true });
    }
  }, [brewTempC, setValue]);

  const dose = watch("doseGrams");
  const yieldG = watch("yieldGrams");
  const grindLevel = watch("grindLevel");
  const grinderId = watch("grinderId");
  const beanId = watch("beanId");

  // Check if selected grinder is a special grinder (e.g., "Pre-ground")
  const { data: grinders } = useGrinders();
  const { data: beans } = useBeans();
  const selectedGrinder = grinders?.find((g) => g.id === grinderId);
  const isPreGround = selectedGrinder
    ? isSpecialGrinder(selectedGrinder.name)
    : false;

  // Clear grind level when switching to Pre-ground
  useEffect(() => {
    if (isPreGround && grindLevel != null) {
      setValue("grindLevel", undefined, { shouldValidate: false });
    }
  }, [isPreGround, grindLevel, setValue]);

  const beanName = useMemo(
    () => beans?.find((b) => b.id === beanId)?.name ?? null,
    [beans, beanId],
  );

  // ── Section summary for collapsed state ──
  const summaryParts: string[] = [];
  if (beanName) summaryParts.push(beanName);
  if (dose) summaryParts.push(`In: ${dose}g`);
  if (dose && yieldG) summaryParts.push(`1:${(yieldG / dose).toFixed(1)}`);
  const summaryText = summaryParts.join(" · ");

  // ── Dose quick-select: set dose value ──
  const applyDose = useCallback(
    (doseValue: number) => {
      setActiveDose(doseValue);
      setValue("doseGrams", doseValue, { shouldValidate: true });
      if (activeRatio) {
        const computed = parseFloat((doseValue * activeRatio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [activeRatio, setValue],
  );

  // ── Ratio quick-select: set yield = dose × ratio ──
  const applyRatio = useCallback(
    (ratio: number) => {
      setActiveRatio(ratio);
      if (dose) {
        const computed = parseFloat((dose * ratio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [dose, setValue],
  );

  const handleDoseChange = useCallback(
    (val: number | undefined) => {
      setValue("doseGrams", val as number, { shouldValidate: true });
      if (val != null) {
        const matchingDose = DOSE_OPTIONS.find((d) => Math.abs(d - val) < 0.01);
        setActiveDose(matchingDose ?? null);
      } else {
        setActiveDose(null);
      }
      if (val && activeRatio) {
        const computed = parseFloat((val * activeRatio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [activeRatio, setValue],
  );

  const handleYieldChange = useCallback(
    (val: number | undefined) => {
      setActiveRatio(null);
      setValue("yieldGrams", val as number, { shouldValidate: true });
    },
    [setValue],
  );

  const handleSizeChange = useCallback(
    (val: number | undefined) => {
      setValue("sizeOz", val as number, { shouldValidate: true });
      if (val != null) {
        const match = SIZE_OPTIONS.find((s) => Math.abs(s - val) < 0.01);
        setActiveSize(match ?? null);
      } else {
        setActiveSize(null);
      }
    },
    [setValue],
  );

  // ── Temp unit toggle (persisted) ──
  const handleTempUnitToggle = useCallback(() => {
    const next = tempUnit === "C" ? "F" : "C";
    setTempUnitOverride(next);
    localStorage.setItem(TEMP_UNIT_KEY, next);
  }, [tempUnit]);

  const handleTempFChange = useCallback(
    (val: number | undefined) => {
      if (val != null) {
        setValue("brewTempC", fToC(val), { shouldValidate: true });
      } else {
        setValue("brewTempC", undefined, { shouldValidate: false });
      }
    },
    [setValue],
  );

  // Render a step component based on its ID
  const renderStep = (stepId: RecipeStepId) => {
    if (!steps.isStepVisible(stepId)) return null;

    // Hide previous shot if no previousShotId
    if (stepId === "previousShot" && !previousShotId) return null;

    // Hide grind level if Pre-ground is selected
    if (stepId === "grindLevel" && isPreGround) return null;

    switch (stepId) {
      case "beans":
        return (
          <BeanSection key="beans" error={errors.beanId?.message} id="beanId" />
        );
      case "previousShot":
        return (
          <PreviousShotRow
            key="previousShot"
            shotId={previousShotId!}
            onViewShot={onViewShot}
          />
        );
      case "dose":
        return (
          <Controller
            key="dose"
            name="doseGrams"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Dose"
                suffix="g"
                value={field.value}
                onChange={handleDoseChange}
                min={0}
                max={50}
                step={0.1}
                placeholder="—"
                error={errors.doseGrams?.message}
                id="doseGrams"
                labelExtra={
                  <div className="flex items-center gap-1">
                    {DOSE_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDose(d)}
                        tabIndex={-1}
                        className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          activeDose === d
                            ? "bg-amber-600 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                        }`}
                      >
                        {d}g
                      </button>
                    ))}
                  </div>
                }
              />
            )}
          />
        );
      case "yield":
        return (
          <Controller
            key="yield"
            name="yieldGrams"
            control={control}
            render={({ field }) => {
              const targetRatio =
                dose && field.value ? (field.value / dose).toFixed(2) : null;
              return (
                <NumberStepper
                  label="Target Yield"
                  suffix="g"
                  subtitle={`Ratio: ${targetRatio ? `1:${targetRatio}` : "-/-"}`}
                  value={field.value}
                  onChange={handleYieldChange}
                  min={0}
                  max={200}
                  step={0.5}
                  placeholder="—"
                  error={errors.yieldGrams?.message}
                  id="yieldGrams"
                  labelExtra={
                    <div className="flex items-center gap-1">
                      {RATIO_OPTIONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => applyRatio(r)}
                          tabIndex={-1}
                          className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            activeRatio === r
                              ? "bg-amber-600 text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                          }`}
                        >
                          1:{r}
                        </button>
                      ))}
                    </div>
                  }
                />
              );
            }}
          />
        );
      case "size":
        return (
          <Controller
            key="size"
            name="sizeOz"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Size"
                suffix="oz"
                value={field.value ?? undefined}
                onChange={handleSizeChange}
                min={0}
                max={256}
                step={1}
                placeholder="—"
                error={errors.sizeOz?.message}
                id="sizeOz"
                labelExtra={
                  <div className="flex items-center gap-1">
                    {SIZE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setActiveSize(s);
                          setValue("sizeOz", s, { shouldValidate: true });
                        }}
                        tabIndex={-1}
                        className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          activeSize === s
                            ? "bg-amber-600 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                        }`}
                      >
                        {s}oz
                      </button>
                    ))}
                  </div>
                }
              />
            )}
          />
        );
      case "grindLevel":
        return (
          <Controller
            key="grindLevel"
            name="grindLevel"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Grind Level"
                value={field.value}
                onChange={(val) =>
                  setValue("grindLevel", val as number, {
                    shouldValidate: true,
                  })
                }
                min={0}
                max={50}
                step={0.1}
                placeholder="—"
                error={errors.grindLevel?.message}
                id="grindLevel"
              />
            )}
          />
        );
      case "brewTemp": {
        const tempUnitButtons = (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (tempUnit !== "C") handleTempUnitToggle();
              }}
              tabIndex={-1}
              className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tempUnit === "C"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
              }`}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => {
                if (tempUnit !== "F") handleTempUnitToggle();
              }}
              tabIndex={-1}
              className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tempUnit === "F"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
              }`}
            >
              °F
            </button>
          </div>
        );

        return tempUnit === "C" ? (
          <Controller
            key="brewTemp"
            name="brewTempC"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label={`Brew Temp`}
                suffix="°C"
                secondarySuffix={
                  field.value != null
                    ? `${cToF(field.value).toFixed(1)}°F`
                    : undefined
                }
                value={field.value ?? undefined}
                onChange={(val) =>
                  setValue("brewTempC", val, { shouldValidate: true })
                }
                min={50}
                max={110}
                step={0.5}
                placeholder="—"
                error={errors.brewTempC?.message}
                id="brewTempC"
                labelExtra={tempUnitButtons}
              />
            )}
          />
        ) : (
          <NumberStepper
            key="brewTemp"
            label={`Brew Temp`}
            suffix="°F"
            secondarySuffix={
              brewTempC != null ? `${brewTempC.toFixed(1)}°C` : undefined
            }
            value={tempFValue}
            onChange={handleTempFChange}
            min={100}
            max={240}
            step={1}
            placeholder="—"
            error={errors.brewTempC?.message}
            id="brewTempC"
            labelExtra={tempUnitButtons}
          />
        );
      }
      case "brewPressure":
        return (
          <Controller
            key="brewPressure"
            name="brewPressure"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Brew Pressure"
                suffix="bar"
                value={field.value ?? undefined}
                onChange={(val) => {
                  setValue("brewPressure", val, { shouldValidate: true });
                  if (val != null) {
                    const match = PRESSURE_OPTIONS.find(
                      (p) => Math.abs(p - val) < 0.01,
                    );
                    setActivePressure(match ?? null);
                  } else {
                    setActivePressure(null);
                  }
                }}
                min={0}
                max={20}
                step={0.5}
                placeholder="—"
                error={errors.brewPressure?.message}
                id="brewPressure"
                labelExtra={
                  <div className="flex items-center gap-1">
                    {PRESSURE_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setActivePressure(p);
                          setValue("brewPressure", p, { shouldValidate: true });
                        }}
                        tabIndex={-1}
                        className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          activePressure === p
                            ? "bg-amber-600 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                        }`}
                      >
                        {p} bar
                      </button>
                    ))}
                  </div>
                }
              />
            )}
          />
        );
      case "preInfusion":
        return (
          <div key="preInfusion" className="flex flex-col gap-3">
            <Controller
              name="preInfusionDuration"
              control={control}
              render={({ field }) => (
                <NumberStepper
                  label="Pre-infusion start"
                  suffix="sec"
                  value={field.value ?? undefined}
                  onChange={(val) =>
                    setValue("preInfusionDuration", val, { shouldValidate: true })
                  }
                  min={0}
                  max={30}
                  step={0.5}
                  placeholder="—"
                  error={errors.preInfusionDuration?.message}
                  id="preInfusionDuration"
                />
              )}
            />
            <Controller
              name="preInfusionWaitDuration"
              control={control}
              render={({ field }) => (
                <NumberStepper
                  label="Pre-infusion wait"
                  suffix="sec"
                  value={field.value ?? undefined}
                  onChange={(val) =>
                    setValue("preInfusionWaitDuration", val, { shouldValidate: true })
                  }
                  min={0}
                  max={30}
                  step={0.5}
                  placeholder="—"
                  error={errors.preInfusionWaitDuration?.message}
                  id="preInfusionWaitDuration"
                />
              )}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CollapsibleSection
      id="recipe"
      title="Recipe"
      guideAnchor="Recipe"
      summaryText={summaryText}
      isExpanded={steps.isExpanded}
      onToggle={steps.setIsExpanded}
      showAllInputs={showAllInputs}
      footer={
        <>
          {!showAllInputs && onEditInputs && (
            <EditInputsButton onClick={onEditInputs} />
          )}
        </>
      }
    >
      {steps.orderedSteps.map((step) => renderStep(step.id))}
    </CollapsibleSection>
  );
}
