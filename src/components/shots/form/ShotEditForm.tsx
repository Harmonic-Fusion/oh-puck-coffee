"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShotSchema, type CreateShot } from "@/shared/shots/schema";
import { useUpdateShot, useDeleteShot } from "@/components/shots/hooks";
import { Button } from "@/components/common/Button";
import { SectionBasics } from "./SectionBasics";
import { SectionRecipe } from "./SectionRecipe";
import { SectionResults } from "./SectionResults";
import { SectionFlavorWheel } from "./SectionFlavorWheel";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { useToast } from "@/components/common/Toast";
import { ValidationBanner } from "@/components/common/ValidationBanner";
import { BODY_ADJECTIVES } from "@/shared/flavor-wheel/constants";
import type { BodyAdjective } from "@/shared/flavor-wheel/constants";

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

  const methods = useForm<CreateShot>({
    resolver: zodResolver(createShotSchema),
    defaultValues: {
      beanId: shot.beanId,
      grinderId: shot.grinderId,
      machineId: shot.machineId || undefined,
      doseGrams: parseFloat(shot.doseGrams),
      yieldGrams: parseFloat(shot.yieldGrams),
      grindLevel: parseFloat(shot.grindLevel),
      brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : undefined,
      preInfusionDuration: shot.preInfusionDuration ? parseFloat(shot.preInfusionDuration) : undefined,
      brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : undefined,
      yieldActualGrams: shot.yieldActualGrams ? parseFloat(shot.yieldActualGrams) : undefined,
      brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : undefined,
      estimateMaxPressure: shot.estimateMaxPressure ? parseFloat(shot.estimateMaxPressure) : undefined,
      shotQuality: shot.shotQuality,
      rating: shot.rating || undefined,
      flavorWheelBody: (shot.flavorWheelBody && BODY_ADJECTIVES.includes(shot.flavorWheelBody as BodyAdjective))
        ? (shot.flavorWheelBody as BodyAdjective)
        : undefined,
      flavorWheelCategories: shot.flavorWheelCategories || undefined,
      flavorWheelAdjectives: shot.flavorWheelAdjectives || [],
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
        className="space-y-8"
      >
        {methods.formState.isSubmitted && (
          <ValidationBanner errors={methods.formState.errors} />
        )}

        <SectionBasics />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionRecipe />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionResults />

        <hr className="border-stone-200 dark:border-stone-700" />

        <SectionFlavorWheel />

        <div className="flex flex-col gap-4 pt-4">
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
          <div className="flex items-center justify-between gap-4">
            {onDelete ? (
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={() => {
                  if (confirm("Delete this shot?")) {
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
                  }
                }}
                loading={deleteShot.isPending}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                loading={updateShot.isPending}
                size="lg"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
