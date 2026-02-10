"use client";

import { useState, useCallback, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/common/Input";
import type { CreateShot } from "@/shared/shots/schema";

const TEMP_UNIT_KEY = "coffee-temp-unit";
const RATIO_OPTIONS = [1, 2, 3, 4] as const;

const fToC = (f: number) => parseFloat(((f - 32) * (5 / 9)).toFixed(1));
const cToF = (c: number) => parseFloat((c * (9 / 5) + 32).toFixed(1));

function getSavedTempUnit(): "C" | "F" {
  if (typeof window === "undefined") return "F";
  return (localStorage.getItem(TEMP_UNIT_KEY) as "C" | "F") || "F";
}

export function SectionRecipe() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateShot>();

  // ── Persisted temp-unit preference ──
  const [tempUnit, setTempUnit] = useState<"C" | "F">("F");
  const [tempFDisplay, setTempFDisplay] = useState("");
  const [activeRatio, setActiveRatio] = useState<number | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setTempUnit(getSavedTempUnit());
  }, []);

  const dose = watch("doseGrams");
  const yieldG = watch("yieldGrams");
  const time = watch("brewTimeSecs");
  const brewTempC = watch("brewTempC");

  const computedRatio = dose && yieldG ? (yieldG / dose).toFixed(2) : "—";
  const flow = yieldG && time ? (yieldG / time).toFixed(2) : "—";

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
  const handleDoseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const d = parseFloat(e.target.value);
      if (!isNaN(d) && activeRatio) {
        const computed = parseFloat((d * activeRatio).toFixed(1));
        setValue("yieldGrams", computed, { shouldValidate: true });
      }
    },
    [activeRatio, setValue]
  );

  // If user manually edits yield, deselect the ratio button
  const handleYieldChange = useCallback(() => {
    setActiveRatio(null);
  }, []);

  // ── Temp unit toggle (persisted) ──
  const handleTempUnitToggle = useCallback(() => {
    const next = tempUnit === "C" ? "F" : "C";
    setTempUnit(next);
    localStorage.setItem(TEMP_UNIT_KEY, next);
    if (next === "F" && brewTempC) {
      setTempFDisplay(String(cToF(brewTempC)));
    } else {
      setTempFDisplay("");
    }
  }, [tempUnit, brewTempC]);

  const handleTempFChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTempFDisplay(val);
      const f = parseFloat(val);
      if (!isNaN(f)) {
        setValue("brewTempC", fToC(f), { shouldValidate: true });
      } else {
        setValue("brewTempC", undefined, { shouldValidate: false });
      }
    },
    [setValue]
  );

  const handleClear = () => {
    setValue("doseGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("yieldGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("grindLevel", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTimeSecs", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTempC", undefined, { shouldValidate: false });
    setValue("preInfusionDuration", undefined, { shouldValidate: false });
    setActiveRatio(null);
    setTempFDisplay("");
  };

  // Shared input class for consistency
  const inputClass = (hasError?: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
      hasError
        ? "border-red-400 focus:ring-red-400"
        : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
    }`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          Recipe
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <div className="space-y-4">
        {/* ── Dose ── */}
        <Input
          label="Dose (g)"
          type="number"
          step="0.1"
          placeholder="18.0"
          error={errors.doseGrams?.message}
          {...register("doseGrams", { onChange: handleDoseChange })}
        />

        {/* ── Yield with ratio quick-select ── */}
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Yield (g)
            </label>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-stone-400 dark:text-stone-500">
                Ratio
              </span>
              {RATIO_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => applyRatio(r)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                    activeRatio === r
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                  }`}
                >
                  1:{r}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            step="0.1"
            placeholder="36.0"
            {...register("yieldGrams", { onChange: handleYieldChange })}
            className={inputClass(errors.yieldGrams?.message)}
          />
          {errors.yieldGrams && (
            <p className="mt-1 text-xs text-red-500">
              {errors.yieldGrams.message}
            </p>
          )}
        </div>

        {/* ── Grind Level ── */}
        <Input
          label="Grind Level"
          type="number"
          step="0.1"
          placeholder="2.5"
          error={errors.grindLevel?.message}
          {...register("grindLevel")}
        />

        {/* ── Brew Time ── */}
        <Input
          label="Brew Time (sec)"
          type="number"
          step="0.1"
          placeholder="28.0"
          error={errors.brewTimeSecs?.message}
          {...register("brewTimeSecs")}
        />

        {/* ── Brew Temp with °F / °C toggle ── */}
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Brew Temp ({tempUnit === "F" ? "°F" : "°C"})
            </label>
            <button
              type="button"
              onClick={handleTempUnitToggle}
              className="rounded-md px-1.5 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              Switch to {tempUnit === "F" ? "°C" : "°F"}
            </button>
          </div>
          {tempUnit === "C" ? (
            <input
              type="number"
              step="0.1"
              placeholder="93.5"
              {...register("brewTempC")}
              className={inputClass(errors.brewTempC?.message)}
            />
          ) : (
            <input
              type="number"
              step="0.1"
              placeholder="200"
              value={tempFDisplay}
              onChange={handleTempFChange}
              className={inputClass()}
            />
          )}
          {tempUnit === "F" && brewTempC != null && (
            <p className="mt-1 text-xs text-stone-500">= {brewTempC}°C</p>
          )}
          {errors.brewTempC && (
            <p className="mt-1 text-xs text-red-500">
              {errors.brewTempC.message}
            </p>
          )}
        </div>

        {/* ── Pre-infusion ── */}
        <Input
          label="Pre-infusion (sec)"
          type="number"
          step="0.1"
          placeholder="5.0"
          hint="Optional"
          error={errors.preInfusionDuration?.message}
          {...register("preInfusionDuration")}
        />
      </div>

      {/* Computed preview */}
      <div className="flex gap-6 rounded-lg bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
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
    </section>
  );
}
