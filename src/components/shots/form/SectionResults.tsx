"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import { EditOrderModal } from "@/components/common/EditOrderModal";
import { Card } from "@/components/common/Card";
import { BrewTimer } from "./BrewTimer";
import { NestedFlavorWheel } from "@/components/flavor-wheel/NestedFlavorWheel";
import { NestedBodySelector } from "@/components/flavor-wheel/NestedBodySelector";
import { AdjectivesIntensifiersSelector } from "@/components/flavor-wheel/AdjectivesIntensifiersSelector";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";

// ── Results step types and configuration ──

const RESULTS_ORDER_KEY = "coffee-results-order";
const RESULTS_VISIBILITY_KEY = "coffee-results-visibility";
const TASTING_ORDER_KEY = "coffee-tasting-order";
const TASTING_VISIBILITY_KEY = "coffee-tasting-visibility";

type ResultsStepId = "yieldActual" | "brewTime" | "estimateMaxPressure" | "shotQuality";
type TastingStepId = "flavors" | "body" | "adjectives" | "rating" | "bitter" | "sour" | "notes";

interface ResultsStepConfig {
  id: ResultsStepId;
  label: string;
  visible: boolean;
}

interface TastingStepConfig {
  id: TastingStepId;
  label: string;
  visible: boolean;
}

const DEFAULT_RESULTS_STEPS: ResultsStepConfig[] = [
  { id: "yieldActual", label: "Actual Yield", visible: true },
  { id: "brewTime", label: "Brew Time", visible: false },
  { id: "estimateMaxPressure", label: "Est. Max Pressure", visible: false },
  { id: "shotQuality", label: "Shot Quality", visible: false },
];

const DEFAULT_TASTING_STEPS: TastingStepConfig[] = [
  { id: "rating", label: "Rating", visible: true },
  { id: "bitter", label: "Bitter", visible: false },
  { id: "sour", label: "Sour", visible: false },
  { id: "flavors", label: "Flavors", visible: false },
  { id: "body", label: "Body / Texture", visible: false },
  { id: "adjectives", label: "Adjectives & Intensifiers", visible: false },
  { id: "notes", label: "Notes", visible: true },
];

const PRESSURE_OPTIONS = [6, 9, 12] as const;

// ── Color interpolation functions for bitter and sour ──

/**
 * Interpolate between two colors based on a value (1-5)
 * @param value - Value between min and max
 * @param min - Minimum value (default 1)
 * @param max - Maximum value (default 5)
 * @param startColor - RGB color at min (e.g., "rgb(156, 163, 175)" for neutral gray)
 * @param endColor - RGB color at max (e.g., "rgb(234, 179, 8)" for bright yellow)
 * @returns RGB color string
 */
function interpolateColor(
  value: number,
  min: number = 1,
  max: number = 5,
  startColor: string,
  endColor: string
): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Parse RGB values
  const parseRGB = (rgb: string): [number, number, number] => {
    const match = rgb.match(/\d+/g);
    if (!match || match.length !== 3) return [156, 163, 175]; // fallback to neutral gray
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  };
  
  const [r1, g1, b1] = parseRGB(startColor);
  const [r2, g2, b2] = parseRGB(endColor);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get color for sour scale (neutral gray → bright yellow)
 */
function getSourColor(value: number): string {
  return interpolateColor(
    value,
    1,
    5,
    "rgb(156, 163, 175)", // stone-400 (neutral gray)
    "rgb(234, 179, 8)" // amber-500 (bright yellow)
  );
}

/**
 * Get color for bitter scale (neutral gray → dark brown)
 */
function getBitterColor(value: number): string {
  return interpolateColor(
    value,
    1,
    5,
    "rgb(156, 163, 175)", // stone-400 (neutral gray)
    "rgb(69, 26, 3)" // brown-950 (dark brown/black)
  );
}

// ── LocalStorage helpers for Results ──

function getSavedResultsOrder(): ResultsStepId[] {
  if (typeof window === "undefined") return DEFAULT_RESULTS_STEPS.map((s) => s.id);
  const saved = localStorage.getItem(RESULTS_ORDER_KEY);
  if (!saved) return DEFAULT_RESULTS_STEPS.map((s) => s.id);
  try {
    const parsed = JSON.parse(saved) as ResultsStepId[];
    const defaultIds = DEFAULT_RESULTS_STEPS.map((s) => s.id);
    const valid = defaultIds.every((id) => parsed.includes(id));
    return valid ? parsed : DEFAULT_RESULTS_STEPS.map((s) => s.id);
  } catch {
    return DEFAULT_RESULTS_STEPS.map((s) => s.id);
  }
}

function getSavedResultsVisibility(): Record<ResultsStepId, boolean> {
  if (typeof window === "undefined") {
    return DEFAULT_RESULTS_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<ResultsStepId, boolean>);
  }
  const saved = localStorage.getItem(RESULTS_VISIBILITY_KEY);
  if (!saved) {
    return DEFAULT_RESULTS_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<ResultsStepId, boolean>);
  }
  try {
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    return DEFAULT_RESULTS_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: parsed[step.id] ?? step.visible }), {} as Record<ResultsStepId, boolean>);
  } catch {
    return DEFAULT_RESULTS_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<ResultsStepId, boolean>);
  }
}

function saveResultsOrder(order: ResultsStepId[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESULTS_ORDER_KEY, JSON.stringify(order));
}

function saveResultsVisibility(visibility: Record<ResultsStepId, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESULTS_VISIBILITY_KEY, JSON.stringify(visibility));
}

// ── LocalStorage helpers for Tasting Notes ──

function getSavedTastingOrder(): TastingStepId[] {
  if (typeof window === "undefined") return DEFAULT_TASTING_STEPS.map((s) => s.id);
  const saved = localStorage.getItem(TASTING_ORDER_KEY);
  if (!saved) return DEFAULT_TASTING_STEPS.map((s) => s.id);
  try {
    const parsed = JSON.parse(saved) as TastingStepId[];
    const defaultIds = DEFAULT_TASTING_STEPS.map((s) => s.id);
    const valid = defaultIds.every((id) => parsed.includes(id));
    return valid ? parsed : DEFAULT_TASTING_STEPS.map((s) => s.id);
  } catch {
    return DEFAULT_TASTING_STEPS.map((s) => s.id);
  }
}

function getSavedTastingVisibility(): Record<TastingStepId, boolean> {
  if (typeof window === "undefined") {
    return DEFAULT_TASTING_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<TastingStepId, boolean>);
  }
  const saved = localStorage.getItem(TASTING_VISIBILITY_KEY);
  if (!saved) {
    return DEFAULT_TASTING_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<TastingStepId, boolean>);
  }
  try {
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    return DEFAULT_TASTING_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: parsed[step.id] ?? step.visible }), {} as Record<TastingStepId, boolean>);
  } catch {
    return DEFAULT_TASTING_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<TastingStepId, boolean>);
  }
}

function saveTastingOrder(order: TastingStepId[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASTING_ORDER_KEY, JSON.stringify(order));
}

function saveTastingVisibility(visibility: Record<TastingStepId, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASTING_VISIBILITY_KEY, JSON.stringify(visibility));
}

// ── SectionResults Component ──

export function SectionResults() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  const dose = watch("doseGrams");
  const yieldTarget = watch("yieldGrams");
  const yieldActual = watch("yieldActualGrams");
  const brewTime = watch("brewTimeSecs");

  // Calculate ratio for actual yield
  const actualRatio = dose && yieldActual ? (yieldActual / dose).toFixed(2) : null;

  // Calculate flow rate (g/s) from actual yield and brew time
  const flowRate = yieldActual && brewTime ? (yieldActual / brewTime).toFixed(2) : null;

  // ── Results order and visibility ──
  // Initialize with static defaults to avoid hydration mismatch (localStorage read happens in useEffect below)
  const [resultsOrder, setResultsOrder] = useState<ResultsStepId[]>(DEFAULT_RESULTS_STEPS.map((s) => s.id));
  const [resultsVisibility, setResultsVisibility] = useState<Record<ResultsStepId, boolean>>(
    DEFAULT_RESULTS_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<ResultsStepId, boolean>)
  );
  const [showResultsMenu, setShowResultsMenu] = useState(false);
  const [showResultsOrderModal, setShowResultsOrderModal] = useState(false);
  const resultsMenuRef = useRef<HTMLDivElement>(null);

  // ── Tasting Notes order and visibility ──
  const [tastingOrder, setTastingOrder] = useState<TastingStepId[]>(DEFAULT_TASTING_STEPS.map((s) => s.id));
  const [tastingVisibility, setTastingVisibility] = useState<Record<TastingStepId, boolean>>(
    DEFAULT_TASTING_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<TastingStepId, boolean>)
  );
  const [showTastingMenu, setShowTastingMenu] = useState(false);
  const [showTastingOrderModal, setShowTastingOrderModal] = useState(false);
  const tastingMenuRef = useRef<HTMLDivElement>(null);

  // Active pressure quick-select for Estimate Max Pressure
  const [activePressure, setActivePressure] = useState<number | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setResultsOrder(getSavedResultsOrder());
    setResultsVisibility(getSavedResultsVisibility());
    setTastingOrder(getSavedTastingOrder());
    setTastingVisibility(getSavedTastingVisibility());
  }, []);

  // Handle click outside to close menus
  useEffect(() => {
    if (!showResultsMenu && !showTastingMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsMenuRef.current && !resultsMenuRef.current.contains(e.target as Node)) {
        setShowResultsMenu(false);
      }
      if (tastingMenuRef.current && !tastingMenuRef.current.contains(e.target as Node)) {
        setShowTastingMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showResultsMenu, showTastingMenu]);

  // ── Results order modal handlers ──
  const handleResultsOrderChange = useCallback((newOrder: ResultsStepId[], newVisibility: Record<ResultsStepId, boolean>) => {
    setResultsOrder(newOrder);
    setResultsVisibility(newVisibility);
    saveResultsOrder(newOrder);
    saveResultsVisibility(newVisibility);
  }, []);

  // ── Tasting Notes order modal handlers ──
  const handleTastingOrderChange = useCallback((newOrder: TastingStepId[], newVisibility: Record<TastingStepId, boolean>) => {
    setTastingOrder(newOrder);
    setTastingVisibility(newVisibility);
    saveTastingOrder(newOrder);
    saveTastingVisibility(newVisibility);
  }, []);

  // Get ordered steps
  const orderedResultsSteps = useMemo(() => {
    return resultsOrder
      .map((id) => DEFAULT_RESULTS_STEPS.find((s) => s.id === id))
      .filter((step): step is ResultsStepConfig => step !== undefined);
  }, [resultsOrder]);

  const orderedTastingSteps = useMemo(() => {
    return tastingOrder
      .map((id) => DEFAULT_TASTING_STEPS.find((s) => s.id === id))
      .filter((step): step is TastingStepConfig => step !== undefined);
  }, [tastingOrder]);

  // Render a Results step component based on its ID
  const renderResultsStep = (stepId: ResultsStepId) => {
    if (!resultsVisibility[stepId]) return null;

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
                        onClick: () => setValue("yieldActualGrams", yieldTarget, { shouldValidate: true }),
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
                    const match = PRESSURE_OPTIONS.find((p) => Math.abs(p - val) < 0.01);
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
                          setValue("estimateMaxPressure", p, { shouldValidate: true });
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

  // Render a Tasting Notes step component based on its ID
  const renderTastingStep = (stepId: TastingStepId) => {
    if (!tastingVisibility[stepId]) return null;

    switch (stepId) {
      case "flavors":
        return (
          <Controller
            key="flavors"
            name="flavors"
            control={control}
            defaultValue={[]}
            render={({ field }) => {
              return (
                <NestedFlavorWheel
                  value={field.value || []}
                  onChange={field.onChange}
                />
              );
            }}
          />
        );

      case "body":
        return (
          <Controller
            key="body"
            name="bodyTexture"
            control={control}
            defaultValue={[]}
            render={({ field }) => {
              return (
                <NestedBodySelector
                  value={field.value || []}
                  onChange={field.onChange}
                />
              );
            }}
          />
        );

      case "adjectives":
        return (
          <Controller
            key="adjectives"
            name="adjectives"
            control={control}
            defaultValue={[]}
            render={({ field }) => {
              return (
                <AdjectivesIntensifiersSelector
                  value={field.value || []}
                  onChange={field.onChange}
                />
              );
            }}
          />
        );

      case "rating":
        return (
          <Controller
            key="rating"
            name="rating"
            control={control}
            render={({ field }) => (
              <Slider
                label="Rating"
                value={field.value || 1}
                onChange={field.onChange}
                min={1}
                max={5}
                step={0.5}
                error={errors.rating?.message}
                id="rating"
                labels={{
                  1: "Didn't enjoy",
                  2: "Somewhat enjoyed",
                  3: "Enjoyed",
                  4: "Really enjoyed",
                  5: "Loved it",
                }}
              />
            )}
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
                thumbColor={field.value ? getBitterColor(field.value) : undefined}
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
    <>
      {/* Results Section */}
      <Card>
        <section id="results" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                Results
              </h2>
              <a
                href={`${AppRoutes.resources.shotLog.path}#Results`}
                target="_blank"
                rel="noreferrer"
                aria-label="Results guide"
                className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </a>
            </div>
            <div className="relative" ref={resultsMenuRef}>
              <button
                type="button"
                onClick={() => setShowResultsMenu(!showResultsMenu)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                aria-label="Results menu"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              {showResultsMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResultsOrderModal(true);
                      setShowResultsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    Edit Inputs
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-7">
            {orderedResultsSteps.map((step) => renderResultsStep(step.id))}
          </div>
        </section>
      </Card>

      {/* Tasting Notes Section */}
      <Card>
        <section id="tasting-notes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                Tasting Notes
              </h2>
              <a
                href={`${AppRoutes.resources.shotLog.path}#Tasting-Notes`}
                target="_blank"
                rel="noreferrer"
                aria-label="Tasting notes guide"
                className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </a>
            </div>
            <div className="relative" ref={tastingMenuRef}>
              <button
                type="button"
                onClick={() => setShowTastingMenu(!showTastingMenu)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                aria-label="Tasting notes menu"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              {showTastingMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTastingOrderModal(true);
                      setShowTastingMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    Edit Inputs
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-7">
            {orderedTastingSteps.map((step) => renderTastingStep(step.id))}
          </div>
        </section>
      </Card>

      {/* Results Order Modal */}
      <EditOrderModal
        open={showResultsOrderModal}
        onClose={() => setShowResultsOrderModal(false)}
        title="Change Results Inputs"
        items={DEFAULT_RESULTS_STEPS}
        order={resultsOrder}
        visibility={resultsVisibility}
        defaultOrder={DEFAULT_RESULTS_STEPS.map((s) => s.id)}
        defaultVisibility={DEFAULT_RESULTS_STEPS.reduce(
          (acc, step) => ({ ...acc, [step.id]: step.visible }),
          {} as Record<ResultsStepId, boolean>
        )}
        onChange={handleResultsOrderChange}
        requiredFields={["yieldActual"]}
        onReset={() => {
          const defaultOrder = DEFAULT_RESULTS_STEPS.map((s) => s.id);
          const defaultVisibility = DEFAULT_RESULTS_STEPS.reduce(
            (acc, step) => ({ ...acc, [step.id]: step.visible }),
            {} as Record<ResultsStepId, boolean>
          );
          handleResultsOrderChange(defaultOrder, defaultVisibility);
        }}
      />

      {/* Tasting Notes Order Modal */}
      <EditOrderModal
        open={showTastingOrderModal}
        onClose={() => setShowTastingOrderModal(false)}
        title="Change Tasting Notes Inputs"
        items={DEFAULT_TASTING_STEPS}
        order={tastingOrder}
        visibility={tastingVisibility}
        defaultOrder={DEFAULT_TASTING_STEPS.map((s) => s.id)}
        defaultVisibility={DEFAULT_TASTING_STEPS.reduce(
          (acc, step) => ({ ...acc, [step.id]: step.visible }),
          {} as Record<TastingStepId, boolean>
        )}
        onChange={handleTastingOrderChange}
        requiredFields={["rating"]}
        onReset={() => {
          const defaultOrder = DEFAULT_TASTING_STEPS.map((s) => s.id);
          const defaultVisibility = DEFAULT_TASTING_STEPS.reduce(
            (acc, step) => ({ ...acc, [step.id]: step.visible }),
            {} as Record<TastingStepId, boolean>
          );
          handleTastingOrderChange(defaultOrder, defaultVisibility);
        }}
      />
    </>
  );
}
