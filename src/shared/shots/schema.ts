import * as z from "zod";

function parseRequiredRating(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? undefined : numeric;
  }
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  return value;
}

export const createShotSchema = z.object({
  beanId: z.string().min(1, { message: "Required" }),
  /** Ordered unified equipment.id values (user's brew gear). Primary grinder/machine are derived for legacy joins. */
  equipmentIds: z.array(z.string()).max(64).optional(),
  grinderId: z.string().optional(),
  machineId: z.string().optional(),
  doseGrams: z.coerce.number().positive().max(50).optional(),
  yieldGrams: z.coerce.number().positive().max(100).optional(),
  sizeOz: z.coerce.number().positive().max(256).optional(),
  grindLevel: z.coerce.number().nonnegative().optional(),
  brewTempC: z.coerce.number().positive().max(200).optional(),
  preInfusionDuration: z.coerce.number().nonnegative().max(60).optional(),
  preInfusionWaitDuration: z.coerce.number().nonnegative().max(60).optional(),
  brewPressure: z.coerce.number().positive().max(20).optional(),
  // Results
  brewTimeSecs: z.coerce.number().positive().max(120).optional(),
  yieldActualGrams: z.coerce.number().positive().max(200).optional(),
  estimateMaxPressure: z.coerce.number().positive().max(20).optional(),
  flowControl: z.coerce.number().positive().max(20).optional(),
  shotQuality: z.coerce.number().min(1).max(5).refine((val) => {
    // Allow only 0.5 steps: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
    const step = 0.5;
    const normalized = Math.round(val / step) * step;
    return Math.abs(val - normalized) < 0.01;
  }, { message: "Quality must be in 0.5 steps (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)" }).optional(),
  rating: z.preprocess(
    parseRequiredRating,
    z.number({ required_error: "Rating is required", invalid_type_error: "Rating is required" })
      .min(1)
      .max(5)
      .refine((val) => {
        // Allow only 0.5 steps: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
        const step = 0.5;
        const normalized = Math.round(val / step) * step;
        return Math.abs(val - normalized) < 0.01;
      }, { message: "Rating must be in 0.5 steps (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)" }),
  ),
  bitter: z.coerce.number().min(0).max(4).refine((val) => {
    // Allow only 0.5 steps: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4
    const step = 0.5;
    const normalized = Math.round(val / step) * step;
    return Math.abs(val - normalized) < 0.01;
  }, { message: "Bitter must be in 0.5 steps (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4)" }).optional(),
  sour: z.coerce.number().min(0).max(4).refine((val) => {
    // Allow only 0.5 steps: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4
    const step = 0.5;
    const normalized = Math.round(val / step) * step;
    return Math.abs(val - normalized) < 0.01;
  }, { message: "Sour must be in 0.5 steps (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4)" }).optional(),
  toolsUsed: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Flavor data (optional) - separate fields
  flavors: z.array(z.string()).optional(),
  bodyTexture: z.array(z.string()).optional(),
  adjectives: z.array(z.string()).optional(),
});

export const shotSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  beanId: z.string().min(1),
  equipmentIds: z.array(z.string()).nullable(),
  grinderId: z.string().nullable(),
  machineId: z.string().nullable(),
  doseGrams: z.coerce.number(),
  yieldGrams: z.coerce.number(),
  sizeOz: z.coerce.number().nullable(),
  grindLevel: z.coerce.number(),
  brewTempC: z.coerce.number().nullable(),
  preInfusionDuration: z.coerce.number().nullable(),
  preInfusionWaitDuration: z.coerce.number().nullable(),
  brewPressure: z.coerce.number().nullable(),
  // Results
  brewTimeSecs: z.coerce.number().nullable(),
  yieldActualGrams: z.coerce.number(),
  estimateMaxPressure: z.coerce.number().nullable(),
  flowControl: z.coerce.number().nullable(),
  flowRate: z.coerce.number().nullable(),
  shotQuality: z.number().nullable(),
  rating: z.number().nullable(),
  bitter: z.number().nullable(),
  sour: z.number().nullable(),
  toolsUsed: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  flavors: z.array(z.string()).nullable(),
  bodyTexture: z.array(z.string()).nullable(),
  adjectives: z.array(z.string()).nullable(),
  isReferenceShot: z.boolean(),
  isHidden: z.boolean(),
  shareSlug: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateShot = z.infer<typeof createShotSchema>;
export type Shot = z.infer<typeof shotSchema>;
