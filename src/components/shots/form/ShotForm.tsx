"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useCreateShot, useDeleteShot, useToggleReference, useToggleHidden, type ShotWithJoins } from "@/components/shots/hooks";
import { Button } from "@/components/common/Button";
import { SectionSetup } from "./__components__/SectionSetup";
import { SectionRecipe } from "./__components__/SectionRecipe";
import { SectionBrewing } from "./__components__/SectionBrewing";
import { SectionTasting } from "./__components__/SectionTasting";
import { ShotSuccessModal } from "./__components__/ShotSuccessModal";
import { useBeans } from "@/components/beans/hooks";
import { useGrinders, useMachines } from "@/components/equipment/hooks";
import { useToast } from "@/components/common/Toast";
import { ShotDetail } from "@/components/shots/ShotDetail";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import { useShotPrePopulation } from "./hooks";
import type { ShotSummary } from "./__components__/ShotSuccessModal";

// Shell: calls the incompatible react-hook-form APIs so ShotFormInner can be memoized
export function ShotForm({ phrase }: { phrase?: string }) {
  "use no memo";

  const methods = useForm<CreateShot>({
    resolver: zodResolver(createShotSchema) as Resolver<CreateShot>,
    defaultValues: {
      beanId: "",
      grinderId: undefined,
      machineId: undefined,
      doseGrams: undefined,
      yieldGrams: undefined,
      sizeOz: undefined,
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

  const { previousShotId } = useShotPrePopulation(methods);

  // eslint-disable-next-line react-hooks/incompatible-library
  const resultsFields = methods.watch([
    "yieldActualGrams",
    "brewTimeSecs",
    "estimateMaxPressure",
    "shotQuality",
    "rating",
    "notes",
    "flavors",
    "bodyTexture",
    "adjectives",
  ]);

  const hasResultsData = resultsFields.some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "" && v !== null,
  );

  return (
    <ShotFormInner
      methods={methods}
      previousShotId={previousShotId}
      hasResultsData={hasResultsData}
      phrase={phrase}
    />
  );
}

interface ShotFormInnerProps {
  methods: UseFormReturn<CreateShot>;
  previousShotId: string | null;
  hasResultsData: boolean;
  phrase?: string;
}

function ShotFormInner({ methods, previousShotId, hasResultsData, phrase }: ShotFormInnerProps) {
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

  // Form mode: "inProgress" = editing, "logged" = shot just saved (no unsaved warning, no submit)
  const [formMode, setFormMode] = useState<"inProgress" | "logged">("inProgress");

  // State for success modal
  const [successSummary, setSuccessSummary] = useState<ShotSummary | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Warn before leaving only when in progress and user has entered results data
  useEffect(() => {
    if (formMode !== "inProgress" || !hasResultsData) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formMode, hasResultsData]);

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

      const summary: ShotSummary = {
        shotId: shot.id,
        doseGrams: data.doseGrams ?? 0,
        yieldGrams: data.yieldGrams ?? 0,
        yieldActualGrams: data.yieldActualGrams,
        brewTimeSecs: data.brewTimeSecs,
        shotQuality: data.shotQuality,
        rating: data.rating,
        bitter: data.bitter,
        sour: data.sour,
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
      };

      // Keep the same shot values in the form and mark it clean after successful log.
      methods.reset(data);
      setFormMode("logged");
      setSuccessSummary(summary);
      setIsSuccessModalOpen(true);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to log shot");
    }
  };

  const handleSuccessModalClose = () => {
    setFormMode("inProgress");
    setIsSuccessModalOpen(false);
    setSuccessSummary(null);
    methods.reset();
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <SectionSetup />

        <SectionRecipe
          previousShotId={previousShotId}
          onViewShot={(shot) => setSelectedShot(shot)}
        />

        <SectionBrewing />

        <SectionTasting />

        <div className="mt-8 flex flex-col items-center gap-3">
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
          <Button
            type="submit"
            loading={createShot.isPending}
            disabled={createShot.isPending || formMode === "logged"}
            size="lg"
            className="w-full py-4 text-lg"
          >
            Log Shot
          </Button>
        </div>
      </form>

      <ShotSuccessModal
        open={isSuccessModalOpen && !!successSummary}
        onClose={handleSuccessModalClose}
        summary={successSummary}
        phrase={phrase}
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
