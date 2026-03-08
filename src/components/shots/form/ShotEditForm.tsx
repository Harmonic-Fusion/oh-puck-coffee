"use client";

import { useState } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useUpdateShot, useDeleteShot } from "@/components/shots/hooks";
import { SectionSetup } from "./__components__/SectionSetup";
import { SectionRecipe } from "./__components__/SectionRecipe";
import { SectionBrewing } from "./__components__/SectionBrewing";
import { SectionTasting } from "./__components__/SectionTasting";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { useToast } from "@/components/common/Toast";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import { ActionButtonBar } from "@/components/shots/ActionButtonBar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

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
      brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : undefined,
      yieldActualGrams: shot.yieldActualGrams ? parseFloat(shot.yieldActualGrams) : undefined,
      brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : undefined,
      estimateMaxPressure: shot.estimateMaxPressure ? parseFloat(shot.estimateMaxPressure) : undefined,
      shotQuality: shot.shotQuality,
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

  const onSubmit = async (data: CreateShot) => {
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

          <SectionRecipe showAllInputs />

          <hr className="border-stone-200 dark:border-stone-700" />

          <SectionBrewing showAllInputs />

          <hr className="border-stone-200 dark:border-stone-700" />

          <SectionTasting showAllInputs />
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
