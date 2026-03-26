"use client";

import { useState } from "react";
import { useForm, FormProvider, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useUpdateShot, useDeleteShot } from "@/components/shots/hooks";
import { SectionSetup } from "./__components__/SectionSetup";
import { SectionRecipe, DEFAULT_RECIPE_STEPS } from "./__components__/SectionRecipe";
import { SectionBrewing, DEFAULT_RESULTS_STEPS } from "./__components__/SectionBrewing";
import { SectionTasting, DEFAULT_TASTING_STEPS } from "./__components__/SectionTasting";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { useToast } from "@/components/common/Toast";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import { ActionButtonBar } from "@/components/shots/ActionButtonBar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useReorderableSteps } from "./hooks/useReorderableSteps";
import type { PendingShotPhoto } from "@/components/shots/ShotPhotoUpload";

/** Inline icons to avoid Turbopack ESM "module factory not available" when passing refs to ActionButtonBar. */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

interface ShotEditFormProps {
  shot: ShotWithJoins;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
}

export function ShotEditForm({ shot, onSuccess, onCancel, onDelete }: ShotEditFormProps) {
  const updateShot = useUpdateShot();
  const deleteShot = useDeleteShot();
  const { showToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Share the same step order/visibility keys as the log form so user preferences are consistent.
  const recipeSteps = useReorderableSteps({
    defaultSteps: DEFAULT_RECIPE_STEPS,
    orderKey: "coffee-recipe-order",
    visibilityKey: "coffee-recipe-visibility",
    showAllInputs: true,
  });
  const resultsSteps = useReorderableSteps({
    defaultSteps: DEFAULT_RESULTS_STEPS,
    orderKey: "coffee-results-order",
    visibilityKey: "coffee-results-visibility",
    showAllInputs: true,
  });
  const tastingSteps = useReorderableSteps({
    defaultSteps: DEFAULT_TASTING_STEPS,
    orderKey: "coffee-tasting-order",
    visibilityKey: "coffee-tasting-visibility",
    showAllInputs: true,
  });

  // Photo uploads are managed separately via the shot detail gallery; start empty here.
  const [pendingPhotos, setPendingPhotos] = useState<PendingShotPhoto[]>([]);

  const methods = useForm<CreateShot>({
    resolver: zodResolver(createShotSchema) as Resolver<CreateShot>,
    defaultValues: {
      beanId: shot.beanId,
      grinderId: shot.grinderId,
      machineId: shot.machineId || undefined,
      doseGrams: shot.doseGrams ? parseFloat(shot.doseGrams) : undefined,
      yieldGrams: shot.yieldGrams ? parseFloat(shot.yieldGrams) : undefined,
      sizeOz: shot.sizeOz ? parseFloat(shot.sizeOz) : undefined,
      grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : undefined,
      brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : undefined,
      preInfusionDuration: shot.preInfusionDuration ? parseFloat(shot.preInfusionDuration) : undefined,
      preInfusionWaitDuration: shot.preInfusionWaitDuration ? parseFloat(shot.preInfusionWaitDuration) : undefined,
      brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : undefined,
      yieldActualGrams: shot.yieldActualGrams ? parseFloat(shot.yieldActualGrams) : undefined,
      brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : undefined,
      estimateMaxPressure: shot.estimateMaxPressure ? parseFloat(shot.estimateMaxPressure) : undefined,
      shotQuality: shot.shotQuality ?? undefined,
      rating: shot.rating ?? undefined,
      bitter: shot.bitter ?? undefined,
      sour: shot.sour ?? undefined,
      flavors: shot.flavors || undefined,
      bodyTexture: shot.bodyTexture || undefined,
      adjectives: shot.adjectives || undefined,
      toolsUsed: shot.toolsUsed || [],
      notes: shot.notes || "",
    },
  });

  const onSubmit: SubmitHandler<CreateShot> = async (data) => {
    try {
      await updateShot.mutateAsync({ id: shot.id, data });
      showToast("success", "Shot updated successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to update shot");
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="flex min-h-full flex-col"
      >
        <div className="flex-1 space-y-8 pb-4">
          {methods.formState.isSubmitted && (
            <ValidationBanner errors={methods.formState.errors} />
          )}

          <SectionSetup />

          <hr className="border-stone-200 dark:border-stone-700" />

          <SectionRecipe steps={recipeSteps} showAllInputs />

          <hr className="border-stone-200 dark:border-stone-700" />

          <SectionBrewing
            steps={resultsSteps}
            pendingPhotos={pendingPhotos}
            onPendingPhotosChange={setPendingPhotos}
            showAllInputs
          />

          <hr className="border-stone-200 dark:border-stone-700" />

          <SectionTasting steps={tastingSteps} showAllInputs />
        </div>

        <div className="sticky -bottom-6 px-6 py-4 border-t border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {/* <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto border-t border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-900"> */}
          <div className="flex flex-col gap-4">
            {(updateShot.isError || methods.formState.errors.root) && (
              <div className="text-sm text-red-500">
                {updateShot.isError && (
                  <p>{updateShot.error.message}</p>
                )}
                {methods.formState.errors.root && (
                  <p>{methods.formState.errors.root.message}</p>
                )}
              </div>
            )}
            <ActionButtonBar
              actions={[
                ...(onDelete
                  ? [
                      {
                        key: "delete",
                        icon: TrashIcon,
                        onClick: () => setConfirmDeleteOpen(true),
                        title: "Delete shot",
                        variant: "danger" as const,
                        className: deleteShot.isPending ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                      },
                    ]
                  : []),
                ...(onCancel
                  ? [
                      {
                        key: "cancel",
                        icon: XMarkIcon,
                        onClick: onCancel,
                        title: "Cancel",
                        variant: "default" as const,
                        className: updateShot.isPending || deleteShot.isPending ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                      },
                    ]
                  : []),
                {
                  key: "save",
                  icon: CheckIcon,
                  onClick: () => {
                    methods.handleSubmit(onSubmit)();
                  },
                  title: "Save changes",
                  variant: "success" as const,
                  className: updateShot.isPending || deleteShot.isPending ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete this shot?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteShot.isPending}
        onConfirm={() => {
          deleteShot.mutate(shot.id, {
            onSuccess: () => {
              showToast("success", "Shot deleted successfully!");
              if (onDelete) onDelete(shot.id);
              if (onSuccess) onSuccess();
            },
            onError: (error) => {
              showToast("error", error instanceof Error ? error.message : "Failed to delete shot");
            },
          });
        }}
      />
    </FormProvider>
  );
}
