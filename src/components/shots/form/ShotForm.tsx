"use client";

import { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useCreateShot } from "@/components/shots/hooks";
import { Button } from "@/components/common/Button";
import { SectionBasics } from "./SectionBasics";
import { SectionRecipe } from "./SectionRecipe";
import { SectionResults } from "./SectionResults";
import { SectionFlavorWheel } from "./SectionFlavorWheel";
import { AppRoutes } from "@/app/routes";
import { useLastShot } from "@/components/shots/hooks";
import { useToast } from "@/components/common/Toast";

export function ShotForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createShot = useCreateShot();
  const { data: lastShot } = useLastShot();
  const { showToast } = useToast();

  const methods = useForm<CreateShot>({
    resolver: zodResolver(createShotSchema),
    defaultValues: {
      beanId: "",
      grinderId: "",
      machineId: undefined,
      doseGrams: undefined,
      yieldGrams: undefined,
      grindLevel: undefined,
      brewTempC: undefined,
      yieldActualGrams: undefined,
      brewTimeSecs: undefined,
      preInfusionDuration: undefined,
      brewPressure: 9,
      shotQuality: undefined,
      flavorWheelBody: undefined,
      flavorWheelCategories: undefined,
      flavorWheelAdjectives: [],
      toolsUsed: [],
      notes: "",
    },
  });

  // Pre-populate from URL params, duplicate shot (sessionStorage), or last shot - only recipe fields, not Results & Tasting
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (hasPrePopulated.current) return;
    
    // Priority 1: Check URL search parameters (from QR code or direct link)
    const urlParams = new URLSearchParams(searchParams.toString());
    if (urlParams.toString()) {
      hasPrePopulated.current = true;
      
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
      
      // Recipe section
      const doseGrams = urlParams.get("doseGrams");
      if (doseGrams) {
        const value = parseFloat(doseGrams);
        if (!isNaN(value)) methods.setValue("doseGrams", value);
      }
      
      const yieldGrams = urlParams.get("yieldGrams");
      if (yieldGrams) {
        const value = parseFloat(yieldGrams);
        if (!isNaN(value)) methods.setValue("yieldGrams", value);
      }
      
      const grindLevel = urlParams.get("grindLevel");
      if (grindLevel) {
        const value = parseFloat(grindLevel);
        if (!isNaN(value)) methods.setValue("grindLevel", value);
      }
      
      const brewTempC = urlParams.get("brewTempC");
      if (brewTempC) {
        const value = parseFloat(brewTempC);
        if (!isNaN(value)) methods.setValue("brewTempC", value);
      }
      
      const preInfusionDuration = urlParams.get("preInfusionDuration");
      if (preInfusionDuration) {
        const value = parseFloat(preInfusionDuration);
        if (!isNaN(value)) methods.setValue("preInfusionDuration", value);
      }
      
      const brewPressure = urlParams.get("brewPressure");
      if (brewPressure) {
        const value = parseFloat(brewPressure);
        if (!isNaN(value)) methods.setValue("brewPressure", value);
      }
      
      // Clear URL params after reading
      if (typeof window !== "undefined") {
        router.replace(AppRoutes.log.path, { scroll: false });
      }
      
      return; // Don't check sessionStorage or lastShot if URL params exist
    }
    
    // Priority 2: Check for duplicate shot data in sessionStorage
    const duplicateDataStr = sessionStorage.getItem("duplicateShot");
    if (duplicateDataStr) {
      try {
        const duplicateData = JSON.parse(duplicateDataStr);
        hasPrePopulated.current = true;
        sessionStorage.removeItem("duplicateShot"); // Clear after use
        
        // Setup section
        if (duplicateData.beanId)
          methods.setValue("beanId", duplicateData.beanId);
        if (duplicateData.grinderId)
          methods.setValue("grinderId", duplicateData.grinderId);
        if (duplicateData.machineId)
          methods.setValue("machineId", duplicateData.machineId);
        if (duplicateData.toolsUsed)
          methods.setValue("toolsUsed", duplicateData.toolsUsed);
        
        // Recipe section
        if (duplicateData.doseGrams !== undefined)
          methods.setValue("doseGrams", duplicateData.doseGrams);
        if (duplicateData.yieldGrams !== undefined)
          methods.setValue("yieldGrams", duplicateData.yieldGrams);
        if (duplicateData.grindLevel !== undefined)
          methods.setValue("grindLevel", duplicateData.grindLevel);
        if (duplicateData.brewTempC !== undefined)
          methods.setValue("brewTempC", duplicateData.brewTempC);
        if (duplicateData.preInfusionDuration !== undefined)
          methods.setValue("preInfusionDuration", duplicateData.preInfusionDuration);
        if (duplicateData.brewPressure !== undefined)
          methods.setValue("brewPressure", duplicateData.brewPressure);
        
        return; // Don't use lastShot if duplicate data exists
      } catch (error) {
        // Invalid JSON, fall through to lastShot
        sessionStorage.removeItem("duplicateShot");
      }
    }
    
    // Priority 3: Fall back to last shot if no duplicate data
    if (lastShot) {
      hasPrePopulated.current = true;
      // Setup section
      if (lastShot.beanId)
        methods.setValue("beanId", lastShot.beanId);
      if (lastShot.grinderId)
        methods.setValue("grinderId", lastShot.grinderId);
      if (lastShot.machineId)
        methods.setValue("machineId", lastShot.machineId);
      if (lastShot.toolsUsed)
        methods.setValue("toolsUsed", lastShot.toolsUsed);
      
      // Recipe section
      if (lastShot.doseGrams)
        methods.setValue("doseGrams", parseFloat(lastShot.doseGrams));
      if (lastShot.yieldGrams)
        methods.setValue("yieldGrams", parseFloat(lastShot.yieldGrams));
      if (lastShot.grindLevel)
        methods.setValue("grindLevel", parseFloat(lastShot.grindLevel));
      if (lastShot.brewTempC)
        methods.setValue("brewTempC", parseFloat(lastShot.brewTempC));
      if (lastShot.preInfusionDuration)
        methods.setValue("preInfusionDuration", parseFloat(lastShot.preInfusionDuration));
      if (lastShot.brewPressure)
        methods.setValue("brewPressure", parseFloat(lastShot.brewPressure));
    }
    
    // Results & Tasting and Flavor Wheel are intentionally NOT pre-populated
  }, [searchParams, lastShot, methods, router]);

  const onSubmit = async (data: CreateShot) => {
    try {
      await createShot.mutateAsync(data);
      methods.reset();
      showToast("success", "Shot logged successfully!");
      router.push(AppRoutes.history.path);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to log shot");
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <SectionBasics />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionRecipe />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionResults />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionFlavorWheel />

        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            loading={createShot.isPending}
            size="lg"
          >
            Log Shot
          </Button>
          {createShot.isError && (
            <p className="text-sm text-red-500">
              {createShot.error.message}
            </p>
          )}
          {methods.formState.errors.root && (
            <p className="text-sm text-red-500">
              {methods.formState.errors.root.message}
            </p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
