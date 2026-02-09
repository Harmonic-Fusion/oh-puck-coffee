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

export function ShotForm() {
  const router = useRouter();
  const createShot = useCreateShot();
  const { data: lastShot } = useLastShot();

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
      flavorProfile: [],
      flavorWheelBody: undefined,
      flavorWheelCategories: undefined,
      flavorWheelAdjectives: [],
      overallPreference: undefined,
      toolsUsed: [],
      notes: "",
    },
  });

  // Pre-populate from last shot (task 2.9)
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (lastShot && !hasPrePopulated.current) {
      hasPrePopulated.current = true;
      if (lastShot.grinderId)
        methods.setValue("grinderId", lastShot.grinderId);
      if (lastShot.machineId)
        methods.setValue("machineId", lastShot.machineId);
      if (lastShot.doseGrams)
        methods.setValue("doseGrams", parseFloat(lastShot.doseGrams));
      if (lastShot.grindLevel)
        methods.setValue("grindLevel", parseFloat(lastShot.grindLevel));
    }
  }, [lastShot, methods]);

  const onSubmit = async (data: CreateShot) => {
    try {
      await createShot.mutateAsync(data);
      methods.reset();
      router.push(AppRoutes.history.path);
    } catch {
      // Error handled by mutation
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
