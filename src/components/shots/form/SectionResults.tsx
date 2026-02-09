"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Slider } from "@/components/common/Slider";
import { CheckboxGroup } from "@/components/common/CheckboxGroup";
import { RadioGroup } from "@/components/common/RadioGroup";
import { Input } from "@/components/common/Input";
import { FLAVOR_PROFILES } from "@/shared/shots/constants";
import { BODY_ADJECTIVES } from "@/shared/flavor-wheel/constants";
import { TOOLS } from "@/shared/equipment/constants";
import type { CreateShot } from "@/shared/shots/schema";

export function SectionResults() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CreateShot>();

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
        Results & Tasting
      </h2>

      <Controller
        name="shotQuality"
        control={control}
        render={({ field }) => (
          <Slider
            label="Shot Quality"
            value={field.value || 1}
            onChange={field.onChange}
            min={1}
            max={10}
            step={1}
            error={errors.shotQuality?.message}
          />
        )}
      />

      <Controller
        name="flavorProfile"
        control={control}
        render={({ field }) => (
          <CheckboxGroup
            label="Flavor Profile"
            options={FLAVOR_PROFILES}
            value={field.value || []}
            onChange={field.onChange}
            columns={3}
          />
        )}
      />

      <Controller
        name="flavorWheelBody"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="Body"
            name="flavorWheelBody"
            options={BODY_ADJECTIVES}
            value={field.value || ""}
            onChange={field.onChange}
            columns={3}
          />
        )}
      />

      <Controller
        name="toolsUsed"
        control={control}
        render={({ field }) => (
          <CheckboxGroup
            label="Tools Used"
            options={TOOLS}
            value={field.value || []}
            onChange={field.onChange}
            columns={2}
          />
        )}
      />

      <Input
        label="Notes"
        placeholder="Any additional observations..."
        error={errors.notes?.message}
        {...register("notes")}
      />
    </section>
  );
}
