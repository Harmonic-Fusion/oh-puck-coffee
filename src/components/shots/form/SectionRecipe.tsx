"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { QRCode } from "@/components/common/QRCode";
import { Modal } from "@/components/common/Modal";
import { EditOrderModal } from "@/components/common/EditOrderModal";
import { ToolSelector } from "@/components/equipment/ToolSelector";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";
import { PreviousShotRow } from "./PreviousShotRow";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { useGrinders } from "@/components/equipment/hooks";
import { isSpecialGrinder } from "@/shared/equipment/constants";
import { TEMP_UNIT_KEY, fToC, cToF } from "@/lib/format-numbers";
const RECIPE_ORDER_KEY = "coffee-recipe-order";
const RECIPE_VISIBILITY_KEY = "coffee-recipe-visibility";
const RATIO_OPTIONS = [1, 2, 3, 4] as const;
const DOSE_OPTIONS = [16, 18, 20, 22] as const;
const PRESSURE_OPTIONS = [6, 9, 12] as const;
const DEFAULT_BREW_TEMP_F = 200;

type RecipeStepId = "dose" | "yield" | "grindLevel" | "brewTemp" | "brewPressure" | "preInfusion" | "toolsUsed";

interface RecipeStepConfig {
  id: RecipeStepId;
  label: string;
  visible: boolean;
}

/**
 * Default recipe section order:
 * 1. Grind Level (visible by default)
 * 2. Dose (visible by default)
 * 3. Target Yield (visible by default)
 * 4. Brew Temp (hidden by default)
 * 5. Brew Pressure (hidden by default)
 * 6. Pre-infusion (hidden by default)
 * 7. Tools Used (hidden by default)
 */
const DEFAULT_STEPS: RecipeStepConfig[] = [
  { id: "grindLevel", label: "Grind Level", visible: true },
  { id: "dose", label: "Dose", visible: true },
  { id: "yield", label: "Target Yield", visible: true },
  { id: "brewTemp", label: "Brew Temp", visible: false },
  { id: "brewPressure", label: "Brew Pressure", visible: false },
  { id: "preInfusion", label: "Pre-infusion", visible: false },
  { id: "toolsUsed", label: "Tools Used", visible: false },
];

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

interface SectionRecipeProps {
  previousShotId?: string | null;
  onViewShot?: (shot: ShotWithJoins) => void;
}

export function SectionRecipe({ previousShotId, onViewShot }: SectionRecipeProps) {
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
  // Initialize with static defaults to avoid hydration mismatch (localStorage read happens in useEffect below)
  const [recipeOrder, setRecipeOrder] = useState<RecipeStepId[]>(DEFAULT_STEPS.map((s) => s.id));
  const [recipeVisibility, setRecipeVisibility] = useState<Record<RecipeStepId, boolean>>(
    DEFAULT_STEPS.reduce((acc, step) => ({ ...acc, [step.id]: step.visible }), {} as Record<RecipeStepId, boolean>)
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setTempUnit(getSavedTempUnit());
    setRecipeOrder(getSavedRecipeOrder());
    setRecipeVisibility(getSavedRecipeVisibility());
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
  // If brewTempC is ever unset, fall back to 200°F
  useEffect(() => {
    if (brewTempC != null) {
      if (tempUnit === "F") {
        setTempFValue(cToF(brewTempC));
      }
    } else {
      const defaultC = fToC(DEFAULT_BREW_TEMP_F);
      setValue("brewTempC", defaultC, { shouldValidate: true });
      setTempFValue(DEFAULT_BREW_TEMP_F);
    }
  }, [brewTempC, tempUnit, setValue]);

  const dose = watch("doseGrams");
  const yieldG = watch("yieldGrams");
  const grindLevel = watch("grindLevel");
  const preInfusionDuration = watch("preInfusionDuration");
  const brewPressure = watch("brewPressure");
  const beanId = watch("beanId");
  const grinderId = watch("grinderId");
  const machineId = watch("machineId");
  const toolsUsed = watch("toolsUsed");

  // Check if selected grinder is a special grinder (e.g., "Pre-ground")
  const { data: grinders } = useGrinders();
  const selectedGrinder = grinders?.find((g) => g.id === grinderId);
  const isPreGround = selectedGrinder ? isSpecialGrinder(selectedGrinder.name) : false;

  // Clear grind level when switching to Pre-ground
  useEffect(() => {
    if (isPreGround && grindLevel != null) {
      setValue("grindLevel", undefined, { shouldValidate: false });
    }
  }, [isPreGround, grindLevel, setValue]);

  const computedRatio = dose && yieldG ? (yieldG / dose).toFixed(2) : "—";

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
    if (brewTempC) params.set("brewTempC", brewTempC.toString());
    if (preInfusionDuration) params.set("preInfusionDuration", preInfusionDuration.toString());
    if (brewPressure) params.set("brewPressure", brewPressure.toString());
    if (toolsUsed && Array.isArray(toolsUsed) && toolsUsed.length > 0) {
      params.set("toolsUsed", toolsUsed.join(","));
    }
    
    return `${window.location.origin}${AppRoutes.log.path}?${params.toString()}`;
  }, [beanId, grinderId, machineId, dose, yieldG, grindLevel, brewTempC, preInfusionDuration, brewPressure, toolsUsed]);

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

    // Hide grind level if Pre-ground is selected
    if (stepId === "grindLevel" && isPreGround) return null;

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
                id="doseGrams"
                labelExtra={
                  <div className="flex items-center gap-1">
                    {DOSE_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDose(d)}
                        tabIndex={-1}
                        className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeDose === d
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
              const targetRatio = dose && field.value ? (field.value / dose).toFixed(2) : null;
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
                          className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeRatio === r
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
              onClick={() => { if (tempUnit !== "C") handleTempUnitToggle(); }}
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
              onClick={() => { if (tempUnit !== "F") handleTempUnitToggle(); }}
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
                secondarySuffix={field.value != null ? `${cToF(field.value).toFixed(1)}°F` : undefined}
                value={field.value ?? undefined}
                onChange={(val) => setValue("brewTempC", val, { shouldValidate: true })}
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
            secondarySuffix={brewTempC != null ? `${brewTempC.toFixed(1)}°C` : undefined}
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
                        className={`h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activePressure === p
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
                error={errors.preInfusionDuration?.message}
                id="preInfusionDuration"
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
            render={({ field }) => (
              <ToolSelector
                value={field.value || []}
                onChange={field.onChange}
              />
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <section id="recipe" className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Recipe
        </h2>
        <a
          href={`${AppRoutes.blog.shotLog.path}#Recipe`}
          target="_blank"
          rel="noreferrer"
          aria-label="Recipe guide"
          className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </a>
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
              <button
                type="button"
                onClick={() => {
                  setShowQRCode(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Recipe QR Code
              </button>
            </div>
          )}
        </div>
      </div>

      {previousShotId && (
        <PreviousShotRow shotId={previousShotId} onViewShot={onViewShot} />
      )}

      <div className="space-y-7">
        {orderedSteps.map((step) => renderStep(step.id))}
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
            <QRCode value={recipeQRUrl} size={250} title="Recipe QR Code" />
          )}
        </div>
      </Modal>

      {/* Recipe Order Modal */}
      <EditOrderModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Change Recipe Order"
        items={DEFAULT_STEPS}
        order={recipeOrder}
        visibility={recipeVisibility}
        defaultOrder={DEFAULT_STEPS.map((s) => s.id)}
        defaultVisibility={DEFAULT_STEPS.reduce(
          (acc, step) => ({ ...acc, [step.id]: step.visible }),
          {} as Record<RecipeStepId, boolean>
        )}
        onChange={handleOrderChange}
        requiredFields={["dose", "yield"]}
        onReset={() => {
          const defaultOrder = DEFAULT_STEPS.map((s) => s.id);
          const defaultVisibility = DEFAULT_STEPS.reduce(
            (acc, step) => ({ ...acc, [step.id]: step.visible }),
            {} as Record<RecipeStepId, boolean>
          );
          handleOrderChange(defaultOrder, defaultVisibility);
        }}
      />
    </section>
  );
}
