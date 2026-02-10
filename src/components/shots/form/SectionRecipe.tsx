"use client";

import { useState, useCallback, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
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
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<CreateShot>();

  // ── Persisted temp-unit preference ──
  const [tempUnit, setTempUnit] = useState<"C" | "F">("F");
  const [tempFValue, setTempFValue] = useState<number | undefined>(undefined);
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
    (val: number | undefined) => {
      setValue("doseGrams", val as number, { shouldValidate: true });
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

  const handleClear = () => {
    setValue("doseGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("yieldGrams", undefined as unknown as number, { shouldValidate: false });
    setValue("grindLevel", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTimeSecs", undefined as unknown as number, { shouldValidate: false });
    setValue("brewTempC", undefined, { shouldValidate: false });
    setValue("preInfusionDuration", undefined, { shouldValidate: false });
    setActiveRatio(null);
    setTempFValue(undefined);
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Recipe
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 rounded-lg border-2 border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-red-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-red-400"
        >
          Clear section
        </button>
      </div>

      <div className="space-y-7">
        {/* ── Dose ── */}
        <Controller
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
            />
          )}
        />

        {/* ── Yield with ratio quick-select ── */}
        <Controller
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
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
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
          )}
        />

        {/* ── Grind Level ── */}
        <Controller
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

        {/* ── Brew Time ── */}
        <Controller
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

        {/* ── Brew Temp with °F / °C toggle ── */}
        {tempUnit === "C" ? (
          <Controller
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
                className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                Switch to °C
              </button>
            }
          />
        )}

        {/* ── Pre-infusion ── */}
        <Controller
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
      </div>

      {/* Computed preview */}
      <div className="flex gap-6 rounded-xl bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
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
