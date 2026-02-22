"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UseFormReturn } from "react-hook-form";
import type { CreateShot } from "@/shared/shots/schema";
import { useLastShot, useShot, type ShotWithJoins } from "@/components/shots/hooks";
import { AppRoutes } from "@/app/routes";

// ---------------------------------------------------------------------------
// Helpers (private to this module)
// ---------------------------------------------------------------------------

interface RecipeValues {
  beanId?: string;
  grinderId?: string;
  machineId?: string;
  toolsUsed?: string[];
  doseGrams?: number;
  yieldGrams?: number;
  grindLevel?: number;
  brewTempC?: number;
  preInfusionDuration?: number;
  brewPressure?: number;
}

/** Convert a ShotWithJoins (string numeric fields) into parsed RecipeValues. */
function shotToRecipeValues(shot: ShotWithJoins): RecipeValues {
  return {
    beanId: shot.beanId || undefined,
    grinderId: shot.grinderId || undefined,
    machineId: shot.machineId || undefined,
    toolsUsed: shot.toolsUsed || undefined,
    doseGrams: shot.doseGrams ? parseFloat(shot.doseGrams) : undefined,
    yieldGrams: shot.yieldGrams ? parseFloat(shot.yieldGrams) : undefined,
    grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : undefined,
    brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : undefined,
    preInfusionDuration: shot.preInfusionDuration ? parseFloat(shot.preInfusionDuration) : undefined,
    brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : undefined,
  };
}

/** Apply recipe values to the form via setValue (setup + recipe fields only). */
function applyRecipeToForm(
  methods: UseFormReturn<CreateShot>,
  values: RecipeValues,
): void {
  // Setup section
  if (values.beanId) methods.setValue("beanId", values.beanId);
  if (values.grinderId) methods.setValue("grinderId", values.grinderId);
  if (values.machineId) methods.setValue("machineId", values.machineId);
  if (values.toolsUsed) methods.setValue("toolsUsed", values.toolsUsed);

  // Recipe section
  if (values.doseGrams !== undefined) methods.setValue("doseGrams", values.doseGrams);
  if (values.yieldGrams !== undefined) methods.setValue("yieldGrams", values.yieldGrams);
  if (values.grindLevel !== undefined) methods.setValue("grindLevel", values.grindLevel);
  if (values.brewTempC !== undefined) methods.setValue("brewTempC", values.brewTempC);
  if (values.preInfusionDuration !== undefined) methods.setValue("preInfusionDuration", values.preInfusionDuration);
  if (values.brewPressure !== undefined) methods.setValue("brewPressure", values.brewPressure);
}

/** Read individual recipe params from URLSearchParams (QR code / direct link). */
function applyUrlParamsToForm(
  methods: UseFormReturn<CreateShot>,
  urlParams: URLSearchParams,
): void {
  // Setup section
  const beanId = urlParams.get("beanId");
  if (beanId) methods.setValue("beanId", beanId);

  const grinderId = urlParams.get("grinderId");
  if (grinderId) methods.setValue("grinderId", grinderId);

  const machineId = urlParams.get("machineId");
  if (machineId) methods.setValue("machineId", machineId);

  const toolsUsed = urlParams.get("toolsUsed");
  if (toolsUsed) {
    methods.setValue("toolsUsed", toolsUsed.split(",").filter(Boolean));
  }

  // Recipe section — parse each numeric param individually
  const numericFields = [
    "doseGrams",
    "yieldGrams",
    "grindLevel",
    "brewTempC",
    "preInfusionDuration",
    "brewPressure",
  ] as const;

  for (const field of numericFields) {
    const raw = urlParams.get(field);
    if (raw) {
      const value = parseFloat(raw);
      if (!isNaN(value)) methods.setValue(field, value);
    }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates the shot form pre-population priority chain.
 *
 * Priority order:
 *   0. `previousShotId=` (empty) in URL → start fresh, no pre-population
 *   1. `previousShotId=<id>` or `shotId=<id>` in URL → fetch & apply that shot
 *   2. Individual recipe params in URL (QR code / direct link)
 *   3. Duplicate shot data in sessionStorage
 *   4. Last shot from the database (most recent)
 *
 * Results & Tasting fields are intentionally never pre-populated.
 */
export function useShotPrePopulation(
  methods: UseFormReturn<CreateShot>,
): { previousShotId: string | null; resetPrePopulation: () => void } {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const parsedParams = new URLSearchParams(searchParams.toString());
  const shotIdFromUrl =
    parsedParams.get("previousShotId") || parsedParams.get("shotId") || null;

  // Explicit empty previousShotId= means "start fresh, no previous shot"
  const explicitNoPreviousShot =
    parsedParams.has("previousShotId") && !parsedParams.get("previousShotId");

  // Data sources
  const { data: previousShot, isError: previousShotNotFound } = useShot(shotIdFromUrl);
  const { data: lastShot } = useLastShot();

  // Track the resolved previous shot ID for PreviousShotRow display
  const [previousShotId, setPreviousShotId] = useState<string | null>(shotIdFromUrl);

  // Keep previousShotId in sync when the URL value changes (immediate UI update)
  useEffect(() => {
    setPreviousShotId(shotIdFromUrl);
  }, [shotIdFromUrl]);

  // Gate: run pre-population logic only once per URL state
  const hasPrePopulated = useRef(false);

  // Reset the gate when searchParams change (e.g. "Log Another" soft navigation)
  const prevSearchParamsStr = useRef(searchParams.toString());
  useEffect(() => {
    const current = searchParams.toString();
    if (current !== prevSearchParamsStr.current) {
      prevSearchParamsStr.current = current;
      hasPrePopulated.current = false;
    }
  }, [searchParams]);

  /**
   * Reset the pre-population gate so the next render re-runs the priority
   * chain. Call this after `methods.reset()` on successful submission so the
   * form re-populates from the latest shot data.
   */
  function resetPrePopulation() {
    hasPrePopulated.current = false;
    setPreviousShotId(null);
  }

  // Main pre-population effect (imperative setValue calls)
  useEffect(() => {
    if (hasPrePopulated.current) return;

    // Priority 0: explicit empty previousShotId= → start fresh
    if (explicitNoPreviousShot) {
      hasPrePopulated.current = true;
      return;
    }

    // Priority 1: shot ID from URL
    if (shotIdFromUrl) {
      // Shot not found in database → fall back to empty form
      if (previousShotNotFound) {
        hasPrePopulated.current = true;
        setPreviousShotId(null);
        return;
      }
      // Still loading → wait (don't fall through to lower priorities)
      if (!previousShot) return;

      hasPrePopulated.current = true;
      setPreviousShotId(shotIdFromUrl);
      applyRecipeToForm(methods, shotToRecipeValues(previousShot));
      return;
    }

    // Priority 2: individual recipe params in URL (QR code / direct link)
    const urlParams = new URLSearchParams(searchParams.toString());
    if (urlParams.toString()) {
      hasPrePopulated.current = true;
      applyUrlParamsToForm(methods, urlParams);

      // Clear URL params after reading
      if (typeof window !== "undefined") {
        router.replace(AppRoutes.log.path, { scroll: false });
      }
      return;
    }

    // Priority 3: duplicate shot in sessionStorage
    const duplicateDataStr = sessionStorage.getItem("duplicateShot");
    if (duplicateDataStr) {
      try {
        const duplicateData = JSON.parse(duplicateDataStr) as RecipeValues & { shotId?: string };
        hasPrePopulated.current = true;
        sessionStorage.removeItem("duplicateShot");

        if (duplicateData.shotId) {
          setPreviousShotId(duplicateData.shotId);
        }
        applyRecipeToForm(methods, duplicateData);
        return;
      } catch {
        // Invalid JSON — fall through to lastShot
        sessionStorage.removeItem("duplicateShot");
      }
    }

    // Priority 4: most recent shot from database
    if (lastShot) {
      hasPrePopulated.current = true;
      setPreviousShotId(lastShot.id);
      applyRecipeToForm(methods, shotToRecipeValues(lastShot));
    }

    // Results & Tasting and Flavor Wheel are intentionally NOT pre-populated
  }, [
    searchParams,
    lastShot,
    previousShot,
    previousShotNotFound,
    shotIdFromUrl,
    explicitNoPreviousShot,
    methods,
    router,
  ]);

  return { previousShotId, resetPrePopulation };
}
