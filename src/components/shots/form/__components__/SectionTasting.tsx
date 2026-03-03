"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import { EditOrderModal } from "@/components/common/EditOrderModal";
import { NestedFlavorWheel } from "@/components/flavor-wheel/NestedFlavorWheel";
import { NestedBodySelector } from "@/components/flavor-wheel/NestedBodySelector";
import { AdjectivesIntensifiersSelector } from "@/components/flavor-wheel/AdjectivesIntensifiersSelector";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel";
import { EditInputsButton } from "./EditInputsButton";
import { CollapsibleSection } from "./CollapsibleSection";
import type { CreateShot } from "@/shared/shots/schema";
import { RATING_LABELS } from "@/lib/format-rating";
import { getRequiredStepIds, type ReorderableStepConfig } from "../step-config";
import { useReorderableSteps } from "../hooks/useReorderableSteps";

// ── Step configuration ──

type TastingStepId =
  | "flavors"
  | "body"
  | "adjectives"
  | "rating"
  | "bitter"
  | "sour"
  | "notes";

const DEFAULT_TASTING_STEPS: ReorderableStepConfig<TastingStepId>[] = [
  { id: "bitter", label: "Bitter", visible: false },
  { id: "sour", label: "Sour", visible: false },
  { id: "flavors", label: "Flavors", visible: false },
  { id: "body", label: "Body / Texture", visible: false },
  { id: "adjectives", label: "Adjectives & Intensifiers", visible: false },
  { id: "rating", label: "Rating", visible: true, required: true },
  { id: "notes", label: "Notes", visible: true },
];

const REQUIRED_TASTING_FIELDS: TastingStepId[] = getRequiredStepIds(
  DEFAULT_TASTING_STEPS,
);

// ── Color interpolation for bitter/sour sliders ──

function interpolateColor(
  value: number,
  min: number = 1,
  max: number = 5,
  startColor: string,
  endColor: string,
): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const parseRGB = (rgb: string): [number, number, number] => {
    const match = rgb.match(/\d+/g);
    if (!match || match.length !== 3) return [156, 163, 175];
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  };

  const [r1, g1, b1] = parseRGB(startColor);
  const [r2, g2, b2] = parseRGB(endColor);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function getSourColor(value: number): string {
  return interpolateColor(value, 1, 5, "rgb(156, 163, 175)", "rgb(234, 179, 8)");
}

function getBitterColor(value: number): string {
  return interpolateColor(value, 1, 5, "rgb(156, 163, 175)", "rgb(69, 26, 3)");
}

// ── SectionTasting Component ──

interface SectionTastingProps {
  showAllInputs?: boolean;
}

export function SectionTasting({ showAllInputs = false }: SectionTastingProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const rating = watch("rating");
  const flavors = watch("flavors");
  const adjectives = watch("adjectives");

  // Collapsed summary
  const summaryParts: string[] = [];
  if (rating != null) summaryParts.push(`★ ${rating}`);
  if (flavors && flavors.length > 0)
    summaryParts.push(
      `${flavors.length} flavor${flavors.length !== 1 ? "s" : ""}`,
    );
  if (adjectives && adjectives.length > 0)
    summaryParts.push(`${adjectives.length} adj`);
  const summaryText = summaryParts.join(" · ");

  const steps = useReorderableSteps({
    defaultSteps: DEFAULT_TASTING_STEPS,
    orderKey: "coffee-tasting-order",
    visibilityKey: "coffee-tasting-visibility",
    showAllInputs,
  });

  const renderStep = (stepId: TastingStepId) => {
    if (!steps.isStepVisible(stepId)) return null;

    switch (stepId) {
      case "flavors":
        return (
          <Controller
            key="flavors"
            name="flavors"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <NestedFlavorWheel
                value={field.value || []}
                onChange={field.onChange}
                data={FLAVOR_WHEEL_DATA}
              />
            )}
          />
        );

      case "body":
        return (
          <Controller
            key="body"
            name="bodyTexture"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <NestedBodySelector
                value={field.value || []}
                onChange={field.onChange}
              />
            )}
          />
        );

      case "adjectives":
        return (
          <Controller
            key="adjectives"
            name="adjectives"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <AdjectivesIntensifiersSelector
                value={field.value || []}
                onChange={field.onChange}
              />
            )}
          />
        );

      case "rating":
        return (
          <Controller
            key="rating"
            name="rating"
            control={control}
            render={({ field }) => {
              const hasRating = field.value != null;
              return (
                <Slider
                  label="Rating"
                  value={field.value}
                  onChange={field.onChange}
                  min={1}
                  max={5}
                  step={0.5}
                  showValue={hasRating}
                  error={errors.rating?.message}
                  id="rating"
                  labels={RATING_LABELS}
                />
              );
            }}
          />
        );

      case "bitter":
        return (
          <Controller
            key="bitter"
            name="bitter"
            control={control}
            render={({ field }) => (
              <Slider
                label="Bitter"
                value={field.value || 1}
                onChange={field.onChange}
                min={1}
                max={5}
                step={0.5}
                error={errors.bitter?.message}
                id="bitter"
                thumbColor={
                  field.value ? getBitterColor(field.value) : undefined
                }
                labels={{
                  1: "Not bitter",
                  2: "Slightly bitter",
                  3: "Moderately bitter",
                  4: "Very bitter",
                  5: "Extremely bitter",
                }}
              />
            )}
          />
        );

      case "sour":
        return (
          <Controller
            key="sour"
            name="sour"
            control={control}
            render={({ field }) => (
              <Slider
                label="Sour"
                value={field.value || 1}
                onChange={field.onChange}
                min={1}
                max={5}
                step={0.5}
                error={errors.sour?.message}
                id="sour"
                thumbColor={field.value ? getSourColor(field.value) : undefined}
                labels={{
                  1: "Not sour",
                  2: "Slightly sour",
                  3: "Moderately sour",
                  4: "Very sour",
                  5: "Extremely sour",
                }}
              />
            )}
          />
        );

      case "notes":
        return (
          <Textarea
            key="notes"
            label="Notes"
            placeholder="Any additional observations..."
            error={errors.notes?.message}
            rows={4}
            id="notes"
            {...register("notes")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <CollapsibleSection
      id="tasting-notes"
      title="Tasting Notes"
      guideAnchor="Tasting-Notes"
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
            title="Change Tasting Notes Inputs"
            items={DEFAULT_TASTING_STEPS}
            order={steps.order}
            visibility={steps.visibility}
            defaultOrder={DEFAULT_TASTING_STEPS.map((s) => s.id)}
            defaultVisibility={steps.defaultVisibility}
            onChange={steps.handleOrderChange}
            onSave={() => steps.setIsExpanded(true)}
            requiredFields={REQUIRED_TASTING_FIELDS}
            onReset={steps.handleReset}
          />
        </>
      }
    >
      {steps.orderedSteps.map((step) => renderStep(step.id))}
    </CollapsibleSection>
  );
}
