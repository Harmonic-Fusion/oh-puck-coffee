"use client";

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { Slider } from "@/components/common/Slider";
import { EditOrderModal } from "@/components/common/EditOrderModal";
import { BrewTimer } from "./BrewTimer";
import { EditInputsButton } from "./EditInputsButton";
import { CollapsibleSection } from "./CollapsibleSection";
import type { CreateShot } from "@/shared/shots/schema";
import { getRequiredStepIds, type ReorderableStepConfig } from "../step-config";
import { useReorderableSteps } from "../hooks/useReorderableSteps";

// ── Step configuration ──

type ResultsStepId =
  | "yieldActual"
  | "brewTime"
  | "estimateMaxPressure"
  | "shotQuality";

const DEFAULT_RESULTS_STEPS: ReorderableStepConfig<ResultsStepId>[] = [
  { id: "brewTime", label: "Brew Time", visible: false },
  { id: "yieldActual", label: "Actual Yield", visible: false },
  { id: "estimateMaxPressure", label: "Est. Max Pressure", visible: false },
  { id: "shotQuality", label: "Shot Quality", visible: false },
];

const REQUIRED_RESULTS_FIELDS: ResultsStepId[] = getRequiredStepIds(
  DEFAULT_RESULTS_STEPS,
);

const PRESSURE_OPTIONS = [6, 9, 12] as const;

// ── SectionBrewing Component ──

interface SectionBrewingProps {
  showAllInputs?: boolean;
}

export function SectionBrewing({ showAllInputs = false }: SectionBrewingProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const dose = watch("doseGrams");
  const yieldTarget = watch("yieldGrams");
  const yieldActual = watch("yieldActualGrams");
  const brewTime = watch("brewTimeSecs");
  const shotQuality = watch("shotQuality");

  const actualRatio =
    dose && yieldActual ? (yieldActual / dose).toFixed(2) : null;
  const flowRate =
    yieldActual && brewTime ? (yieldActual / brewTime).toFixed(2) : null;

  // Collapsed summary
  const summaryParts: string[] = [];
  if (actualRatio) summaryParts.push(`1:${actualRatio}`);
  if (flowRate) summaryParts.push(`${flowRate} g/s`);
  if (shotQuality) summaryParts.push(`Q${shotQuality}`);
  const summaryText = summaryParts.join(" · ");

  const steps = useReorderableSteps({
    defaultSteps: DEFAULT_RESULTS_STEPS,
    orderKey: "coffee-results-order",
    visibilityKey: "coffee-results-visibility",
    showAllInputs,
  });

  const [activePressure, setActivePressure] = useState<number | null>(null);

  const renderStep = (stepId: ResultsStepId) => {
    if (!steps.isStepVisible(stepId)) return null;

    switch (stepId) {
      case "yieldActual":
        return (
          <Controller
            key="yieldActual"
            name="yieldActualGrams"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Actual Yield"
                suffix="g"
                subtitle={`Ratio: ${actualRatio ? `1:${actualRatio}` : "-/-"}`}
                value={field.value}
                onChange={(val) => field.onChange(val)}
                min={0}
                max={200}
                step={0.1}
                placeholder="—"
                error={errors.yieldActualGrams?.message}
                id="yieldActualGrams"
                placeholderAction={
                  yieldTarget
                    ? {
                        label: `Use Target Yield ${yieldTarget}g`,
                        onClick: () =>
                          setValue("yieldActualGrams", yieldTarget, {
                            shouldValidate: true,
                          }),
                      }
                    : undefined
                }
              />
            )}
          />
        );

      case "brewTime":
        return (
          <Controller
            key="brewTime"
            name="brewTimeSecs"
            control={control}
            render={({ field }) => (
              <div>
                <NumberStepper
                  label="Brew Time"
                  suffix="sec"
                  subtitle={`Flow Rate: ${flowRate ? `${flowRate} g/s` : "-:-"}`}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  min={0}
                  max={120}
                  step={0.1}
                  placeholder="—"
                  error={errors.brewTimeSecs?.message}
                  noRound={true}
                  id="brewTimeSecs"
                />
                <BrewTimer
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  className="mt-2 flex h-32 w-full"
                />
              </div>
            )}
          />
        );

      case "estimateMaxPressure":
        return (
          <Controller
            key="estimateMaxPressure"
            name="estimateMaxPressure"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Est. Max Pressure"
                suffix="bar"
                value={field.value ?? undefined}
                onChange={(val) => {
                  field.onChange(val);
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
                step={0.2}
                placeholder="—"
                error={errors.estimateMaxPressure?.message}
                id="estimateMaxPressure"
                labelExtra={
                  <div className="flex items-center gap-1">
                    {PRESSURE_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setActivePressure(p);
                          setValue("estimateMaxPressure", p, {
                            shouldValidate: true,
                          });
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

      case "shotQuality":
        return (
          <Controller
            key="shotQuality"
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
                id="shotQuality"
                labels={{
                  1: "Failed to Extract",
                  2: "Severe channeling or spraying",
                  3: "Channeling detected",
                  4: "Good - Minor unevenness",
                  5: "Excellent - Even extraction",
                }}
              />
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <CollapsibleSection
      id="results"
      title="Brewing"
      guideAnchor="Results"
      summaryText={summaryText}
      isExpanded={steps.isExpanded}
      onToggle={steps.setIsExpanded}
      showAllInputs={showAllInputs}
      footer={
        <>
          {!showAllInputs && (
            <EditInputsButton
              onClick={() => steps.setShowOrderModal(true)}
            />
          )}
          <EditOrderModal
            open={steps.showOrderModal}
            onClose={() => steps.setShowOrderModal(false)}
            title="Change Results Inputs"
            items={DEFAULT_RESULTS_STEPS}
            order={steps.order}
            visibility={steps.visibility}
            defaultOrder={DEFAULT_RESULTS_STEPS.map((s) => s.id)}
            defaultVisibility={steps.defaultVisibility}
            onChange={steps.handleOrderChange}
            onSave={() => steps.setIsExpanded(true)}
            requiredFields={REQUIRED_RESULTS_FIELDS}
            onReset={steps.handleReset}
          />
        </>
      }
    >
      {steps.orderedSteps.map((step) => renderStep(step.id))}
    </CollapsibleSection>
  );
}
