"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
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
import { no_pucking_swearing } from "@/lib/no-pucking";
import { useState } from "react";

// ── Step configuration ──

export type TastingStepId =
  | "flavors"
  | "body"
  | "adjectives"
  | "rating"
  | "bitter"
  | "sour"
  | "notes";

export const DEFAULT_TASTING_STEPS: ReorderableStepConfig<TastingStepId>[] = [
  { id: "bitter", label: "Bitter", description: "Bitterness level on a 0–4 scale", visible: false },
  { id: "sour", label: "Sour", description: "Sourness / acidity level on a 0–4 scale", visible: false },
  { id: "flavors", label: "Flavors", description: "Specific flavor notes from the flavor wheel", visible: false },
  { id: "body", label: "Body / Texture", description: "Body and texture of the drink in your mouth.", visible: false },
  { id: "adjectives", label: "Adjectives & Intensifiers", description: "Descriptive words and intensity qualifiers", visible: false },
  { id: "rating", label: "Rating", description: "Overall shot rating", visible: true, required: true },
  { id: "notes", label: "Notes", description: "Free-form notes about the shot", visible: true },
];

export const REQUIRED_TASTING_FIELDS: TastingStepId[] = getRequiredStepIds(
  DEFAULT_TASTING_STEPS,
);

// ── Color interpolation for bitter/sour sliders ──

function interpolateColor(
  value: number,
  min: number = 0,
  max: number = 4,
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
  return interpolateColor(value, 0, 4, "rgb(156, 163, 175)", "rgb(234, 179, 8)");
}

function getBitterColor(value: number): string {
  return interpolateColor(value, 0, 4, "rgb(156, 163, 175)", "rgb(69, 26, 3)");
}

// ── SectionTasting Component ──

interface SectionTastingProps {
  showAllInputs?: boolean;
  onEditInputs?: () => void;
  steps: ReturnType<typeof useReorderableSteps<TastingStepId>>;
}

export function SectionTasting({
  showAllInputs = false,
  onEditInputs,
  steps,
}: SectionTastingProps) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const [showSwearBanner, setShowSwearBanner] = useState(false);

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
                value={field.value ?? 0}
                onChange={field.onChange}
                min={0}
                max={4}
                step={0.5}
                error={errors.bitter?.message}
                id="bitter"
                thumbColor={
                  field.value != null ? getBitterColor(field.value) : undefined
                }
                labels={{
                  0: "Not bitter",
                  1: "Slightly bitter",
                  2: "Moderately bitter",
                  3: "Very bitter",
                  4: "Extremely bitter",
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
                value={field.value ?? 0}
                onChange={field.onChange}
                min={0}
                max={4}
                step={0.5}
                error={errors.sour?.message}
                id="sour"
                thumbColor={field.value != null ? getSourColor(field.value) : undefined}
                labels={{
                  0: "Not sour",
                  1: "Slightly sour",
                  2: "Moderately sour",
                  3: "Very sour",
                  4: "Extremely sour",
                }}
              />
            )}
          />
        );

      case "notes": {
        const { onBlur: rhfOnBlur, ...notesProps } = register("notes");
        return (
          <div key="notes" className="space-y-2">
            <Textarea
              label="Notes"
              placeholder="Any additional observations..."
              error={errors.notes?.message}
              rows={4}
              id="notes"
              {...notesProps}
              onBlur={(e) => {
                const originalText = e.target.value;
                const filteredText = no_pucking_swearing(originalText);
                if (originalText !== filteredText) {
                  setValue("notes", filteredText, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setShowSwearBanner(true);
                }
                rhfOnBlur(e);
              }}
            />
            {showSwearBanner && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm font-medium text-amber-800 animate-in fade-in slide-in-from-top-1 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="text-lg">🚫</span>
                <span>No pucking swearing! 😂</span>
              </div>
            )}
          </div>
        );
      }

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
