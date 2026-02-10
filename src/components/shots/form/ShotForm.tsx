"use client";

import { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
      brewTimeSecs: undefined,
      brewTempC: undefined,
      preInfusionDuration: undefined,
      shotQuality: undefined,
      flavorWheelBody: undefined,
      flavorWheelCategories: undefined,
      flavorWheelAdjectives: [],
      toolsUsed: [],
      notes: "",
    },
  });

  // Pre-populate from last shot - only recipe fields, not Results & Tasting
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (lastShot && !hasPrePopulated.current) {
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
      if (lastShot.brewTimeSecs)
        methods.setValue("brewTimeSecs", parseFloat(lastShot.brewTimeSecs));
      if (lastShot.brewTempC)
        methods.setValue("brewTempC", parseFloat(lastShot.brewTempC));
      if (lastShot.preInfusionDuration)
        methods.setValue("preInfusionDuration", parseFloat(lastShot.preInfusionDuration));
      
      // Results & Tasting and Flavor Wheel are intentionally NOT pre-populated
    }
  }, [lastShot, methods]);

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
