"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import { EditOrderModal } from "@/components/common/EditOrderModal";
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

type ResultsStepId = "yieldActual" | "brewTime" | "estimateMaxPressure" | "shotQuality" | "rating" | "notes" | "flavors" | "body" | "adjectives";

interface ResultsStepConfig {
  id: ResultsStepId;
  label: string;
  visible: boolean;
}

const DEFAULT_RESULTS_STEPS: ResultsStepConfig[] = [
  { id: "yieldActual", label: "Actual Yield", visible: true },
  { id: "brewTime", label: "Brew Time", visible: true },
  { id: "estimateMaxPressure", label: "Est. Max Pressure", visible: false },
  { id: "shotQuality", label: "Shot Quality", visible: false },
  { id: "rating", label: "Rating", visible: true },
  { id: "notes", label: "Notes", visible: true },
  { id: "flavors", label: "Flavors", visible: false },
  { id: "body", label: "Body / Texture", visible: false },
  { id: "adjectives", label: "Adjectives & Intensifiers", visible: false },
];

const TIME_OPTIONS = [10, 20, 30] as const;
const PRESSURE_OPTIONS = [6, 9, 12] as const;

// ── LocalStorage helpers ──

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
  const [showMenu, setShowMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Active pressure quick-select for Estimate Max Pressure
  const [activePressure, setActivePressure] = useState<number | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setResultsOrder(getSavedResultsOrder());
    setResultsVisibility(getSavedResultsVisibility());
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // ── Results order modal handlers ──
  const handleOrderChange = useCallback((newOrder: ResultsStepId[], newVisibility: Record<ResultsStepId, boolean>) => {
    setResultsOrder(newOrder);
    setResultsVisibility(newVisibility);
    saveResultsOrder(newOrder);
    saveResultsVisibility(newVisibility);
  }, []);

  // Get ordered steps
  const orderedSteps = useMemo(() => {
    return resultsOrder
      .map((id) => DEFAULT_RESULTS_STEPS.find((s) => s.id === id))
      .filter((step): step is ResultsStepConfig => step !== undefined);
  }, [resultsOrder]);

  // Render a step component based on its ID
  const renderStep = (stepId: ResultsStepId) => {
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
                  labelExtra={
                    <div className="flex items-center gap-1">
                      {TIME_OPTIONS.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setValue("brewTimeSecs", time, { shouldValidate: true })}
                          tabIndex={-1}
                          className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            field.value === time
                              ? "bg-amber-600 text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                          }`}
                        >
                          {time}s
                        </button>
                      ))}
                    </div>
                  }
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

      default:
        return null;
    }
  };

  return (
    <section id="results" className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
        <a
          href={`${AppRoutes.blog.shotLog.path}#Results`}
          target="_blank"
          rel="noreferrer"
          aria-label="Results guide"
          className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </a>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
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
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => {
                  setShowOrderModal(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Edit Order
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-7">
        {orderedSteps.map((step) => renderStep(step.id))}
      </div>

      {/* Results Order Modal */}
      <EditOrderModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Change Results Order"
        items={DEFAULT_RESULTS_STEPS}
        order={resultsOrder}
        visibility={resultsVisibility}
        defaultOrder={DEFAULT_RESULTS_STEPS.map((s) => s.id)}
        defaultVisibility={DEFAULT_RESULTS_STEPS.reduce(
          (acc, step) => ({ ...acc, [step.id]: step.visible }),
          {} as Record<ResultsStepId, boolean>
        )}
        onChange={handleOrderChange}
        requiredFields={["yieldActual", "rating"]}
        onReset={() => {
          const defaultOrder = DEFAULT_RESULTS_STEPS.map((s) => s.id);
          const defaultVisibility = DEFAULT_RESULTS_STEPS.reduce(
            (acc, step) => ({ ...acc, [step.id]: step.visible }),
            {} as Record<ResultsStepId, boolean>
          );
          handleOrderChange(defaultOrder, defaultVisibility);
        }}
      />
    </section>
  );
}
