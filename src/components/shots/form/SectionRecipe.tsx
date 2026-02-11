"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { NumberStepper } from "@/components/common/NumberStepper";
import { QRCode } from "@/components/common/QRCode";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { AppRoutes } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";

const TEMP_UNIT_KEY = "coffee-temp-unit";
const RATIO_OPTIONS = [1, 2, 3, 4] as const;
const DOSE_OPTIONS = [16, 18, 20, 22] as const;
const PRESSURE_OPTIONS = [6, 9, 12] as const;

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
  const [activeDose, setActiveDose] = useState<number | null>(null);
  const [activePressure, setActivePressure] = useState<number | null>(9);
  const [showQRCode, setShowQRCode] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setTempUnit(getSavedTempUnit());
  }, []);

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
  const brewTempC = watch("brewTempC");
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

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Recipe
        </h2>
      </div>

      <div className="space-y-7">
        {/* ── Dose with quick-select ── */}
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
              labelExtra={
                <div className="flex items-center gap-1">
                  {DOSE_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => applyDose(d)}
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


        {/* ── Brew Pressure with quick-select ── */}
        <Controller
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
      </div>

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
    </section>
  );
}
