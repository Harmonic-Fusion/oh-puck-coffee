"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { Slider } from "@/components/common/Slider";
import { Textarea } from "@/components/common/Textarea";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { BrewTimer } from "./BrewTimer";
import type { CreateShot } from "@/shared/shots/schema";

// ── Results step types and configuration ──

const RESULTS_ORDER_KEY = "coffee-results-order";
const RESULTS_VISIBILITY_KEY = "coffee-results-visibility";

type ResultsStepId = "yieldActual" | "brewTime" | "estimateMaxPressure" | "shotQuality" | "rating" | "notes";

interface ResultsStepConfig {
  id: ResultsStepId;
  label: string;
  visible: boolean;
}

const DEFAULT_RESULTS_STEPS: ResultsStepConfig[] = [
  { id: "yieldActual", label: "Actual Yield", visible: true },
  { id: "brewTime", label: "Brew Time", visible: true },
  { id: "estimateMaxPressure", label: "Est. Max Pressure", visible: false },
  { id: "shotQuality", label: "Shot Quality", visible: true },
  { id: "rating", label: "Rating", visible: true },
  { id: "notes", label: "Notes", visible: true },
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
                secondarySuffix={actualRatio ? `1:${actualRatio}` : undefined}
                value={field.value}
                onChange={(val) => field.onChange(val)}
                min={0}
                max={200}
                step={0.1}
                placeholder="—"
                error={errors.yieldActualGrams?.message}
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
                  secondarySuffix={flowRate ? `${flowRate} g/s` : undefined}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  min={0}
                  max={120}
                  step={0.1}
                  placeholder="—"
                  error={errors.brewTimeSecs?.message}
                  noRound={true}
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
                  className="mt-2 flex h-16 w-full"
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
            {...register("notes")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Results & Tasting
        </h2>
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
      <ResultsOrderModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={resultsOrder}
        visibility={resultsVisibility}
        onChange={handleOrderChange}
      />
    </section>
  );
}

// ── Results Order Modal Component ──

interface ResultsOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: ResultsStepId[];
  visibility: Record<ResultsStepId, boolean>;
  onChange: (order: ResultsStepId[], visibility: Record<ResultsStepId, boolean>) => void;
}

function ResultsOrderModal({ open, onClose, order, visibility, onChange }: ResultsOrderModalProps) {
  const [localOrder, setLocalOrder] = useState<ResultsStepId[]>(order);
  const [localVisibility, setLocalVisibility] = useState<Record<ResultsStepId, boolean>>(visibility);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [draggedItemY, setDraggedItemY] = useState<number | null>(null);

  // Handle drag end (mouse)
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
    setDraggedItemY(null);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    if (open) {
      setLocalOrder(order);
      setLocalVisibility(visibility);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchStartY(null);
      setDraggedItemY(null);
    }
  }, [open, order, visibility]);

  // Global mouse move handler for dragging
  useEffect(() => {
    if (draggedIndex === null) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedIndex === null || touchStartY === null) return;

      const currentY = e.clientY;
      setDraggedItemY(currentY);

      const items = document.querySelectorAll("[data-results-drag-item]");
      let newDragOverIndex: number | null = null;

      items.forEach((item, idx) => {
        if (idx === draggedIndex) return;
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        if (currentY >= itemRect.top && currentY <= itemRect.bottom) {
          newDragOverIndex = currentY < itemCenterY ? idx : idx + 1;
        }
      });

      if (newDragOverIndex === null) {
        const firstItem = items[0] as HTMLElement | undefined;
        const lastItem = items[items.length - 1] as HTMLElement | undefined;
        if (firstItem && currentY < firstItem.getBoundingClientRect().top) {
          newDragOverIndex = 0;
        } else if (lastItem && currentY > lastItem.getBoundingClientRect().bottom) {
          newDragOverIndex = localOrder.length;
        }
      }

      if (newDragOverIndex !== null && newDragOverIndex !== dragOverIndex) {
        setDragOverIndex(newDragOverIndex);
        const insertIndex = newDragOverIndex > draggedIndex ? newDragOverIndex - 1 : newDragOverIndex;
        if (insertIndex !== draggedIndex && insertIndex >= 0 && insertIndex < localOrder.length) {
          setLocalOrder((prevOrder) => {
            const newOrder = [...prevOrder];
            const [removed] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(insertIndex, 0, removed);
            return newOrder;
          });
          setDraggedIndex(insertIndex);
        }
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleDragEnd);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, [draggedIndex, dragOverIndex, touchStartY, localOrder, handleDragEnd]);

  const toggleVisibility = (stepId: ResultsStepId) => {
    setLocalVisibility((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleSave = () => {
    onChange(localOrder, localVisibility);
    onClose();
  };

  const handleReset = () => {
    const defaultOrder = DEFAULT_RESULTS_STEPS.map((s) => s.id);
    const defaultVisibility = DEFAULT_RESULTS_STEPS.reduce(
      (acc, step) => ({ ...acc, [step.id]: step.visible }),
      {} as Record<ResultsStepId, boolean>
    );
    setLocalOrder(defaultOrder);
    setLocalVisibility(defaultVisibility);
    onChange(defaultOrder, defaultVisibility);
  };

  const handleDragStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setDraggedIndex(index);
    setTouchStartY(e.clientY);
    setDraggedItemY(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDraggedIndex(index);
    setTouchStartY(touch.clientY);
    setDraggedItemY(touch.clientY);
    document.body.style.overflow = "hidden";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const currentY = touch.clientY;
    setDraggedItemY(currentY);

    const items = document.querySelectorAll("[data-results-drag-item]");
    let newDragOverIndex: number | null = null;

    items.forEach((item, idx) => {
      if (idx === draggedIndex) return;
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      if (currentY >= itemRect.top && currentY <= itemRect.bottom) {
        newDragOverIndex = currentY < itemCenterY ? idx : idx + 1;
      }
    });

    if (newDragOverIndex === null) {
      const firstItem = items[0] as HTMLElement | undefined;
      const lastItem = items[items.length - 1] as HTMLElement | undefined;
      if (firstItem && currentY < firstItem.getBoundingClientRect().top) {
        newDragOverIndex = 0;
      } else if (lastItem && currentY > lastItem.getBoundingClientRect().bottom) {
        newDragOverIndex = localOrder.length;
      }
    }

    if (newDragOverIndex !== null && newDragOverIndex !== dragOverIndex) {
      setDragOverIndex(newDragOverIndex);
      const insertIndex = newDragOverIndex > draggedIndex ? newDragOverIndex - 1 : newDragOverIndex;
      if (insertIndex !== draggedIndex && insertIndex >= 0 && insertIndex < localOrder.length) {
        const newOrder = [...localOrder];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(insertIndex, 0, removed);
        setLocalOrder(newOrder);
        setDraggedIndex(insertIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
    setDraggedItemY(null);
    document.body.style.overflow = "";
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Results Order"
      footer={
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Drag items to reorder and show or hide items. Changes are saved automatically.
        </p>
        {localOrder.map((stepId, index) => {
          const step = DEFAULT_RESULTS_STEPS.find((s) => s.id === stepId);
          if (!step) return null;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={stepId}
              data-results-drag-item
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50 shadow-lg opacity-75 dark:border-amber-400 dark:bg-amber-900/20"
                  : isDragOver
                  ? "border-amber-400 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-900/10"
                  : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800"
              }`}
              style={
                isDragging && draggedItemY !== null && touchStartY !== null
                  ? {
                      transform: `translateY(${draggedItemY - touchStartY}px)`,
                      zIndex: 1000,
                      position: "relative",
                    }
                  : {}
              }
            >
              <div
                className="touch-none cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                onMouseDown={(e) => handleDragStart(e, index)}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: "none", userSelect: "none" }}
              >
                <svg
                  className="h-5 w-5 text-stone-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="9" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" />
                  <circle cx="15" cy="5" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="15" cy="19" r="1.5" />
                </svg>
              </div>
              <label className="flex flex-1 items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localVisibility[stepId]}
                  onChange={() => toggleVisibility(stepId)}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                />
                <span className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200">
                  {step.label}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
