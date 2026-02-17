"use client";

import { useEffect, useRef, useState } from "react";
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
import { ShotSuccessModal } from "./ShotSuccessModal";
import { AppRoutes } from "@/app/routes";
import { useLastShot, useDeleteShot, useToggleReference, useToggleHidden, type ShotWithJoins } from "@/components/shots/hooks";
import { useBeans } from "@/components/beans/hooks";
import { useGrinders, useMachines } from "@/components/equipment/hooks";
import { useToast } from "@/components/common/Toast";
import { ShotDetail } from "@/components/shots/log/ShotDetail";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import type { ShotSummary } from "./ShotSuccessModal";

export function ShotForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createShot = useCreateShot();
  const { data: lastShot } = useLastShot();
  const { data: beans } = useBeans();
  const { data: grinders } = useGrinders();
  const { data: machines } = useMachines();
  const { showToast } = useToast();
  const deleteShot = useDeleteShot();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();

  // State for shot detail modal
  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);

  // State for success modal
  const [successSummary, setSuccessSummary] = useState<ShotSummary | null>(null);

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
      estimateMaxPressure: undefined,
      preInfusionDuration: undefined,
      brewPressure: 9,
      shotQuality: undefined,
      rating: undefined,
      flavorWheelBody: undefined,
      flavorWheelCategories: undefined,
      flavorWheelAdjectives: [],
      toolsUsed: [],
      notes: "",
    },
  });

  // Track the previous shot ID used for pre-population
  const [previousShotId, setPreviousShotId] = useState<string | null>(null);

  // Pre-populate from URL params, duplicate shot (sessionStorage), or last shot - only recipe fields, not Results & Tasting
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (hasPrePopulated.current) return;
    
    // Priority 1: Check URL search parameters (from QR code or direct link)
    const urlParams = new URLSearchParams(searchParams.toString());
    if (urlParams.toString()) {
      hasPrePopulated.current = true;
      
      // Track shot ID if provided in URL params
      const shotIdFromUrl = urlParams.get("shotId");
      if (shotIdFromUrl) {
        setPreviousShotId(shotIdFromUrl);
      }
      
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
        
        // Track the shot ID if it was stored
        if (duplicateData.shotId) {
          setPreviousShotId(duplicateData.shotId);
        }
        
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
      setPreviousShotId(lastShot.id);
      
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
      const shot = await createShot.mutateAsync(data);
      const bean = beans?.find((b) => b.id === data.beanId);
      const grinder = grinders?.find((g) => g.id === data.grinderId);
      const machine = data.machineId ? machines?.find((m) => m.id === data.machineId) : null;

      const formatRoastDate = (d: Date | null | undefined): string | null => {
        if (!d) return null;
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      };

      methods.reset();
      setSuccessSummary({
        shotId: shot.id,
        doseGrams: data.doseGrams,
        yieldGrams: data.yieldGrams,
        yieldActualGrams: data.yieldActualGrams,
        brewTimeSecs: data.brewTimeSecs,
        shotQuality: data.shotQuality,
        rating: data.rating,
        notes: data.notes,
        beanName: bean?.name ?? null,
        beanRoastLevel: bean?.roastLevel ?? null,
        beanOrigin: bean?.origin ?? null,
        beanRoaster: bean?.roaster ?? null,
        beanRoastDate: formatRoastDate(bean?.roastDate),
        beanProcessingMethod: bean?.processingMethod ?? null,
        grindLevel: data.grindLevel,
        brewTempC: data.brewTempC,
        brewPressure: data.brewPressure,
        grinderName: grinder?.name ?? null,
        machineName: machine?.name ?? null,
        flavorWheelCategories: data.flavorWheelCategories ?? null,
        flavorWheelAdjectives: data.flavorWheelAdjectives ?? null,
        flavorWheelBody: data.flavorWheelBody ?? null,
      });
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
        {methods.formState.isSubmitted && (
          <ValidationBanner errors={methods.formState.errors} />
        )}

        <SectionBasics />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionRecipe 
          previousShotId={previousShotId} 
          onViewShot={(shot) => setSelectedShot(shot)}
        />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionResults />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionFlavorWheel />

        <div className="flex flex-col items-center gap-3 pt-6">
          <Button
            type="submit"
            loading={createShot.isPending}
            size="lg"
            className="w-full py-4 text-lg"
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

      <ShotSuccessModal
        open={!!successSummary}
        onClose={() => setSuccessSummary(null)}
        summary={successSummary}
      />

      <ShotDetail
        shot={selectedShot}
        open={!!selectedShot}
        onClose={() => setSelectedShot(null)}
        onDelete={async (id) => {
          await deleteShot.mutateAsync(id);
          if (selectedShot?.id === id) {
            setSelectedShot(null);
          }
        }}
        onToggleReference={(id) => {
          toggleReference.mutate(id, {
            onSuccess: (updatedShot) => {
              if (selectedShot?.id === id) {
                setSelectedShot((prev) => 
                  prev ? { ...prev, isReferenceShot: updatedShot.isReferenceShot } : null
                );
              }
            },
          });
        }}
        onToggleHidden={(id) => {
          toggleHidden.mutate(id, {
            onSuccess: (updatedShot) => {
              if (selectedShot?.id === id) {
                setSelectedShot((prev) => 
                  prev ? { ...prev, isHidden: updatedShot.isHidden } : null
                );
              }
            },
          });
        }}
      />
    </FormProvider>
  );
}
