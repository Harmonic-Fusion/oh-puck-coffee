"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useCreateShot, useDeleteShot, useToggleReference, useToggleHidden, type ShotWithJoins } from "@/components/shots/hooks";
import { Button } from "@/components/common/Button";
import { SectionBasics } from "./SectionBasics";
import { SectionRecipe } from "./SectionRecipe";
import { SectionResults } from "./SectionResults";
import { ShotSuccessModal } from "./ShotSuccessModal";
import { useBeans } from "@/components/beans/hooks";
import { useGrinders, useMachines } from "@/components/equipment/hooks";
import { useToast } from "@/components/common/Toast";
import { ShotDetail } from "@/components/shots/log/ShotDetail";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import { useShotPrePopulation } from "./hooks";
import type { ShotSummary } from "./ShotSuccessModal";

export function ShotForm() {
  const createShot = useCreateShot();
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
      grinderId: undefined,
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
      flavors: undefined,
      bodyTexture: undefined,
      adjectives: undefined,
      toolsUsed: [],
      notes: "",
    },
  });

  // Pre-populate form from URL params, sessionStorage, or last shot
  const { previousShotId, resetPrePopulation } = useShotPrePopulation(methods);

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
      resetPrePopulation();
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
        flavors: data.flavors ?? null,
        bodyTexture: data.bodyTexture ?? null,
        adjectives: data.adjectives ?? null,
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
        <SectionBasics />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionRecipe 
          previousShotId={previousShotId} 
          onViewShot={(shot) => setSelectedShot(shot)}
        />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionResults />

        <div className="flex flex-col items-center gap-3 pt-6">
          <Button
            type="submit"
            loading={createShot.isPending}
            size="lg"
            className="w-full py-4 text-lg"
          >
            Log Shot
          </Button>
          {methods.formState.isSubmitted && (
            <ValidationBanner errors={methods.formState.errors} />
          )}
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
