"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { QRCode } from "@/components/common/QRCode";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { ToolSelector } from "@/components/equipment/ToolSelector";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";

const TEMP_UNIT_KEY = "coffee-temp-unit";
const RECIPE_ORDER_KEY = "coffee-recipe-order";
const RECIPE_VISIBILITY_KEY = "coffee-recipe-visibility";
const TOOLS_EXPANDED_KEY = "coffee-tools-expanded";
const RATIO_OPTIONS = [1, 2, 3, 4] as const;
const DOSE_OPTIONS = [16, 18, 20, 22] as const;
const PRESSURE_OPTIONS = [6, 9, 12] as const;

type RecipeStepId = "dose" | "yield" | "grindLevel" | "brewTime" | "brewTemp" | "brewPressure" | "preInfusion" | "toolsUsed";

interface RecipeStepConfig {
  id: RecipeStepId;
  label: string;
  visible: boolean;
}

const DEFAULT_STEPS: RecipeStepConfig[] = [
  { id: "dose", label: "Dose", visible: true },
  { id: "yield", label: "Yield", visible: true },
  { id: "grindLevel", label: "Grind Level", visible: true },
  { id: "brewTime", label: "Brew Time", visible: true },
  { id: "brewTemp", label: "Brew Temp", visible: true },
  { id: "brewPressure", label: "Brew Pressure", visible: true },
  { id: "preInfusion", label: "Pre-infusion", visible: true },
  { id: "toolsUsed", label: "Tools Used", visible: true },
];

const fToC = (f: number) => parseFloat(((f - 32) * (5 / 9)).toFixed(1));
const cToF = (c: number) => parseFloat((c * (9 / 5) + 32).toFixed(1));

function getSavedTempUnit(): "C" | "F" {
  if (typeof window === "undefined") return "F";
  return (localStorage.getItem(TEMP_UNIT_KEY) as "C" | "F") || "F";
}

function getSavedRecipeOrder(): RecipeStepId[] {
  if (typeof window === "undefined") return DEFAULT_STEPS.map((s) => s.id);
  const saved = localStorage.getItem(RECIPE_ORDER_KEY);
  if (!saved) return DEFAULT_STEPS.map((s) => s.id);
  try {
    const parsed = JSON.parse(saved) as RecipeStepId[];
    // Validate that all default steps are present
    const defaultIds = DEFAULT_STEPS.map((s) => s.id);
    const valid = defaultIds.every((id) => parsed.includes(id));
    return valid ? parsed : DEFAULT_STEPS.map((s) => s.id);
  } catch {
    return DEFAULT_STEPS.map((s) => s.id);
  }
}

function getSavedRecipeVisibility(): Record<RecipeStepId, boolean> {
  if (typeof window === "undefined") {
    return DEFAULT_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<RecipeStepId, boolean>);
  }
  const saved = localStorage.getItem(RECIPE_VISIBILITY_KEY);
  if (!saved) {
    return DEFAULT_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<RecipeStepId, boolean>);
  }
  try {
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    // Merge with defaults to ensure all steps have visibility
    return DEFAULT_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: parsed[step.id] ?? step.visible }), {} as Record<RecipeStepId, boolean>);
  } catch {
    return DEFAULT_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<RecipeStepId, boolean>);
  }
}

function saveRecipeOrder(order: RecipeStepId[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECIPE_ORDER_KEY, JSON.stringify(order));
}

function saveRecipeVisibility(visibility: Record<RecipeStepId, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECIPE_VISIBILITY_KEY, JSON.stringify(visibility));
}

function getSavedToolsExpanded(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(TOOLS_EXPANDED_KEY);
  if (saved === null) return true; // Default to expanded
  return saved === "true";
}

function saveToolsExpanded(expanded: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOOLS_EXPANDED_KEY, expanded ? "true" : "false");
}

export function SectionRecipe() {
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<CreateShot>();

  // ── Persisted temp-unit preference ──
  const [tempUnit, setTempUnit] = useState<"C" | "F">("F");
  const [tempFValue, setTempFValue] = useState<number | undefined>(undefined);
  const [activeRatio, setActiveRatio] = useState<number | null>(null);
  const [activeDose, setActiveDose] = useState<number | null>(null);
  const [activePressure, setActivePressure] = useState<number | null>(9);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // ── Recipe order and visibility ──
  const [recipeOrder, setRecipeOrder] = useState<RecipeStepId[]>(() => getSavedRecipeOrder());
  const [recipeVisibility, setRecipeVisibility] = useState<Record<RecipeStepId, boolean>>(() => getSavedRecipeVisibility());
  const [toolsExpanded, setToolsExpanded] = useState<boolean>(() => getSavedToolsExpanded());
  const [showMenu, setShowMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setTempUnit(getSavedTempUnit());
    setRecipeOrder(getSavedRecipeOrder());
    setRecipeVisibility(getSavedRecipeVisibility());
    setToolsExpanded(getSavedToolsExpanded());
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

  // Watch brewTempC early so it can be used in useEffect
  const brewTempC = watch("brewTempC");

  // Sync tempFValue when brewTempC is set from external sources (pre-population)
  useEffect(() => {
    if (tempUnit === "F" && brewTempC != null) {
      setTempFValue(cToF(brewTempC));
    } else if (brewTempC == null) {
      setTempFValue(undefined);
    }
  }, [brewTempC, tempUnit]);

  const dose = watch("doseGrams");
  const yieldG = watch("yieldGrams");
  const time = watch("brewTimeSecs");
  const grindLevel = watch("grindLevel");
  const brewTimeSecs = watch("brewTimeSecs");
  const preInfusionDuration = watch("preInfusionDuration");
  const brewPressure = watch("brewPressure");
  const beanId = watch("beanId");
  const grinderId = watch("grinderId");
  const machineId = watch("machineId");
  const toolsUsed = watch("toolsUsed");

  const computedRatio = dose && yieldG ? (yieldG / dose).toFixed(2) : "—";
  const flow = yieldG && time ? (yieldG / time).toFixed(2) : "—";

  // Generate QR code URL for current recipe
  const recipeQRUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    
    const params = new URLSearchParams();
    if (beanId) params.set("beanId", beanId);
    if (grinderId) params.set("grinderId", grinderId);
    if (machineId) params.set("machineId", machineId);
    if (dose) params.set("doseGrams", dose.toString());
    if (yieldG) params.set("yieldGrams", yieldG.toString());
    if (grindLevel) params.set("grindLevel", grindLevel.toString());
    if (brewTimeSecs) params.set("brewTimeSecs", brewTimeSecs.toString());
    if (brewTempC) params.set("brewTempC", brewTempC.toString());
    if (preInfusionDuration) params.set("preInfusionDuration", preInfusionDuration.toString());
    if (brewPressure) params.set("brewPressure", brewPressure.toString());
    if (toolsUsed && Array.isArray(toolsUsed) && toolsUsed.length > 0) {
      params.set("toolsUsed", toolsUsed.join(","));
    }
    
    return `${window.location.origin}${AppRoutes.log.path}?${params.toString()}`;
  }, [beanId, grinderId, machineId, dose, yieldG, grindLevel, brewTimeSecs, brewTempC, preInfusionDuration, brewPressure, toolsUsed]);

  // ── Dose quick-select: set dose value ──
  const applyDose = useCallback(
    (doseValue: number) => {
      setActiveDose(doseValue);
      setValue("doseGrams", doseValue, { shouldValidate: true });
      // If a ratio is active, recalculate yield
      if (activeRatio) {
        const computed = parseFloat((doseValue * activeRatio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [activeRatio, setValue]
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
    [dose, setValue]
  );

  // When dose changes while a ratio button is active, recalculate yield
  // If manually edited, deselect the dose button if it doesn't match a quick-select option
  const handleDoseChange = useCallback(
    (val: number | undefined) => {
      setValue("doseGrams", val as number, { shouldValidate: true });
      // Check if the value matches any quick-select option
      if (val != null) {
        const matchingDose = DOSE_OPTIONS.find((d) => Math.abs(d - val) < 0.01);
        setActiveDose(matchingDose ?? null);
      } else {
        setActiveDose(null);
      }
      // If a ratio is active, recalculate yield
      if (val && activeRatio) {
        const computed = parseFloat((val * activeRatio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [activeRatio, setValue]
  );

  // If user manually edits yield, deselect the ratio button
  const handleYieldChange = useCallback(
    (val: number | undefined) => {
      setActiveRatio(null);
      setValue("yieldGrams", val as number, { shouldValidate: true });
    },
    [setValue]
  );

  // ── Temp unit toggle (persisted) ──
  const handleTempUnitToggle = useCallback(() => {
    const next = tempUnit === "C" ? "F" : "C";
    setTempUnit(next);
    localStorage.setItem(TEMP_UNIT_KEY, next);
    if (next === "F" && brewTempC) {
      setTempFValue(cToF(brewTempC));
    } else {
      setTempFValue(undefined);
    }
  }, [tempUnit, brewTempC]);

  const handleTempFChange = useCallback(
    (val: number | undefined) => {
      setTempFValue(val);
      if (val != null) {
        setValue("brewTempC", fToC(val), { shouldValidate: true });
      } else {
        setValue("brewTempC", undefined, { shouldValidate: false });
      }
    },
    [setValue]
  );

  // ── Recipe order modal handlers ──
  const handleOrderChange = useCallback((newOrder: RecipeStepId[], newVisibility: Record<RecipeStepId, boolean>) => {
    setRecipeOrder(newOrder);
    setRecipeVisibility(newVisibility);
    saveRecipeOrder(newOrder);
    saveRecipeVisibility(newVisibility);
  }, []);

  // Get ordered steps (all steps in order, visibility checked during render)
  const orderedSteps = useMemo(() => {
    return recipeOrder.map((id) => DEFAULT_STEPS.find((s) => s.id === id)).filter((step): step is RecipeStepConfig => step !== undefined);
  }, [recipeOrder]);

  // Render a step component based on its ID
  const renderStep = (stepId: RecipeStepId) => {
    if (!recipeVisibility[stepId]) return null;

    switch (stepId) {
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
                labelExtra={
                  <div className="flex items-center gap-1">
                    {DOSE_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDose(d)}
                        tabIndex={-1}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeDose === d
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
            render={({ field }) => (
              <NumberStepper
                label="Yield"
                suffix="g"
                value={field.value}
                onChange={handleYieldChange}
                min={0}
                max={200}
                step={0.1}
                placeholder="—"
                error={errors.yieldGrams?.message}
                labelExtra={
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-xs text-stone-400 dark:text-stone-500">
                      Ratio
                    </span>
                    {RATIO_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => applyRatio(r)}
                        tabIndex={-1}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeRatio === r
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
                onChange={(val) => setValue("grindLevel", val as number, { shouldValidate: true })}
                min={0}
                max={50}
                step={0.1}
                placeholder="—"
                error={errors.grindLevel?.message}
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
              <NumberStepper
                label="Brew Time"
                suffix="sec"
                value={field.value}
                onChange={(val) => setValue("brewTimeSecs", val as number, { shouldValidate: true })}
                min={0}
                max={120}
                step={1}
                placeholder="—"
                error={errors.brewTimeSecs?.message}
                noRound={true}
              />
            )}
          />
        );
      case "brewTemp":
        return tempUnit === "C" ? (
          <Controller
            key="brewTemp"
            name="brewTempC"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label={`Brew Temp`}
                suffix="°C"
                secondarySuffix={field.value != null ? `${cToF(field.value).toFixed(1)}°F` : undefined}
                value={field.value ?? undefined}
                onChange={(val) => setValue("brewTempC", val, { shouldValidate: true })}
                min={50}
                max={110}
                step={0.5}
                placeholder="—"
                error={errors.brewTempC?.message}
                labelExtra={
                  <button
                    type="button"
                    onClick={handleTempUnitToggle}
                    tabIndex={-1}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                  >
                    Switch to °F
                  </button>
                }
              />
            )}
          />
        ) : (
          <NumberStepper
            key="brewTemp"
            label={`Brew Temp`}
            suffix="°F"
            secondarySuffix={brewTempC != null ? `${brewTempC.toFixed(1)}°C` : undefined}
            value={tempFValue}
            onChange={handleTempFChange}
            min={120}
            max={230}
            step={1}
            placeholder="—"
            error={errors.brewTempC?.message}
            labelExtra={
              <button
                type="button"
                onClick={handleTempUnitToggle}
                tabIndex={-1}
                className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                Switch to °C
              </button>
            }
          />
        );
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
                    const match = PRESSURE_OPTIONS.find((p) => Math.abs(p - val) < 0.01);
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
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activePressure === p
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
          <Controller
            key="preInfusion"
            name="preInfusionDuration"
            control={control}
            render={({ field }) => (
              <NumberStepper
                label="Pre-infusion"
                suffix="sec"
                value={field.value ?? undefined}
                onChange={(val) => setValue("preInfusionDuration", val, { shouldValidate: true })}
                min={0}
                max={30}
                step={0.5}
                placeholder="—"
                hint="Optional"
                error={errors.preInfusionDuration?.message}
              />
            )}
          />
        );
      case "toolsUsed":
        return (
          <Controller
            key="toolsUsed"
            name="toolsUsed"
            control={control}
            render={({ field }) => {
              const toolsCount = (field.value || []).length;
              const handleToggle = () => {
                const newExpanded = !toolsExpanded;
                setToolsExpanded(newExpanded);
                saveToolsExpanded(newExpanded);
              };
              return (
                <div className="w-full">
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
                  >
                    <span className="text-base font-semibold text-stone-800 dark:text-stone-200">
                      Tools Used {toolsCount > 0 && `(${toolsCount})`}
                    </span>
                    <svg
                      className={`h-5 w-5 text-stone-400 transition-transform ${toolsExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {toolsExpanded && (
                    <div className="mt-2">
                      <ToolSelector
                        value={field.value || []}
                        onChange={field.onChange}
                        hideLabel={true}
                      />
                    </div>
                  )}
                </div>
              );
            }}
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
          Recipe
        </h2>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="Recipe menu"
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

      {/* Computed preview */}
      <div className="flex items-center justify-between gap-6 rounded-xl bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
        <div className="flex gap-6">
          <div>
            <span className="text-stone-500 dark:text-stone-400">Ratio: </span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              1:{computedRatio}
            </span>
          </div>
          <div>
            <span className="text-stone-500 dark:text-stone-400">
              Flow Rate:{" "}
            </span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {flow} g/s
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowQRCode(true)}
          title="Generate QR code for this recipe"
          tabIndex={-1}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="5" height="5" />
            <rect x="16" y="3" width="5" height="5" />
            <rect x="3" y="16" width="5" height="5" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
            <path d="M12 12h.01" />
          </svg>
          <span className="ml-1.5">QR Code</span>
        </Button>
      </div>

      {/* QR Code Modal */}
      <Modal
        open={showQRCode}
        onClose={() => setShowQRCode(false)}
        title="Recipe QR Code"
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-stone-500 dark:text-stone-400">
            Scan this QR code to load this recipe on another device
          </p>
          {recipeQRUrl && (
            <div className="flex flex-col items-center gap-3">
              <QRCode value={recipeQRUrl} size={250} title="Recipe QR Code" />
              <div className="text-center">
                <p className="text-xs font-mono text-stone-400 dark:text-stone-500 break-all max-w-md">
                  {recipeQRUrl}
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Recipe Order Modal */}
      <RecipeOrderModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={recipeOrder}
        visibility={recipeVisibility}
        onChange={handleOrderChange}
      />
    </section>
  );
}

// ── Recipe Order Modal Component ──
interface RecipeOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: RecipeStepId[];
  visibility: Record<RecipeStepId, boolean>;
  onChange: (order: RecipeStepId[], visibility: Record<RecipeStepId, boolean>) => void;
}

function RecipeOrderModal({ open, onClose, order, visibility, onChange }: RecipeOrderModalProps) {
  const [localOrder, setLocalOrder] = useState<RecipeStepId[]>(order);
  const [localVisibility, setLocalVisibility] = useState<Record<RecipeStepId, boolean>>(visibility);
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
    // Restore body scroll
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
      
      // Find which item we're over
      const items = document.querySelectorAll('[data-drag-item]');
      let newDragOverIndex: number | null = null;
      
      items.forEach((item, idx) => {
        if (idx === draggedIndex) return; // Skip the dragged item itself
        
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        
        if (currentY >= itemRect.top && currentY <= itemRect.bottom) {
          // Determine if we're in the upper or lower half
          if (currentY < itemCenterY) {
            newDragOverIndex = idx;
          } else {
            newDragOverIndex = idx + 1;
          }
        }
      });
      
      // Check if we're at the top or bottom
      if (newDragOverIndex === null) {
        const firstItem = items[0] as HTMLElement;
        const lastItem = items[items.length - 1] as HTMLElement;
        if (firstItem && currentY < firstItem.getBoundingClientRect().top) {
          newDragOverIndex = 0;
        } else if (lastItem && currentY > lastItem.getBoundingClientRect().bottom) {
          newDragOverIndex = localOrder.length;
        }
      }
      
      if (newDragOverIndex !== null && newDragOverIndex !== dragOverIndex) {
        setDragOverIndex(newDragOverIndex);
        
        // Reorder if we've moved to a different position
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

  const toggleVisibility = (stepId: RecipeStepId) => {
    setLocalVisibility((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleSave = () => {
    onChange(localOrder, localVisibility);
    onClose();
  };

  const handleReset = () => {
    const defaultOrder = DEFAULT_STEPS.map((s) => s.id);
    const defaultVisibility = DEFAULT_STEPS.reduce(
      (acc, step) => ({ ...acc, [step.id]: step.visible }),
      {} as Record<RecipeStepId, boolean>
    );
    setLocalOrder(defaultOrder);
    setLocalVisibility(defaultVisibility);
    onChange(defaultOrder, defaultVisibility);
  };

  // Handle drag start (mouse)
  const handleDragStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setDraggedIndex(index);
    setTouchStartY(e.clientY);
    setDraggedItemY(e.clientY);
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDraggedIndex(index);
    setTouchStartY(touch.clientY);
    setDraggedItemY(touch.clientY);
    // Prevent body scroll while dragging
    document.body.style.overflow = "hidden";
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    setDraggedItemY(currentY);
    
    // Find which item we're over
    const items = document.querySelectorAll('[data-drag-item]');
    let newDragOverIndex: number | null = null;
    
    items.forEach((item, idx) => {
      if (idx === draggedIndex) return; // Skip the dragged item itself
      
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      
      if (currentY >= itemRect.top && currentY <= itemRect.bottom) {
        // Determine if we're in the upper or lower half
        if (currentY < itemCenterY) {
          newDragOverIndex = idx;
        } else {
          newDragOverIndex = idx + 1;
        }
      }
    });
    
    // Check if we're at the top or bottom
    if (newDragOverIndex === null) {
      const firstItem = items[0] as HTMLElement;
      const lastItem = items[items.length - 1] as HTMLElement;
      if (firstItem && currentY < firstItem.getBoundingClientRect().top) {
        newDragOverIndex = 0;
      } else if (lastItem && currentY > lastItem.getBoundingClientRect().bottom) {
        newDragOverIndex = localOrder.length;
      }
    }
    
    if (newDragOverIndex !== null && newDragOverIndex !== dragOverIndex) {
      setDragOverIndex(newDragOverIndex);
      
      // Reorder if we've moved to a different position
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

  // Handle touch end
  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
    setDraggedItemY(null);
    // Restore body scroll
    document.body.style.overflow = "";
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Recipe Order"
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
          const step = DEFAULT_STEPS.find((s) => s.id === stepId);
          if (!step) return null;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          
          return (
            <div
              key={stepId}
              data-drag-item
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
