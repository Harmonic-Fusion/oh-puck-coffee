import * as z from "zod";
import { BODY_ADJECTIVES } from "../flavor-wheel/constants";

export const createShotSchema = z.object({
  beanId: z.string().uuid(),
  grinderId: z.string().uuid(),
  machineId: z.string().uuid().optional(),
  doseGrams: z.coerce.number().positive().max(50),
  yieldGrams: z.coerce.number().positive().max(100),
  grindLevel: z.coerce.number().nonnegative().optional(),
  brewTempC: z.coerce.number().positive().max(200).optional(),
  preInfusionDuration: z.coerce.number().nonnegative().max(60).optional(),
  brewPressure: z.coerce.number().positive().max(20).optional(),
  // Results
  brewTimeSecs: z.coerce.number().positive().max(120).optional(),
  yieldActualGrams: z.coerce.number().positive().max(200).optional(),
  estimateMaxPressure: z.coerce.number().positive().max(20).optional(),
  flowControl: z.coerce.number().positive().max(20).optional(),
  shotQuality: z.coerce.number({ invalid_type_error: "Required" }).min(1, "Required").max(5).refine((val) => {
    // Allow only 0.5 steps: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
    const step = 0.5;
    const normalized = Math.round(val / step) * step;
    return Math.abs(val - normalized) < 0.01;
  }, { message: "Quality must be in 0.5 steps (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)" }),
  rating: z.coerce.number({ invalid_type_error: "Required" }).min(1, "Required").max(5).refine((val) => {
    // Allow only 0.5 steps: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
    const step = 0.5;
    const normalized = Math.round(val / step) * step;
    return Math.abs(val - normalized) < 0.01;
  }, { message: "Rating must be in 0.5 steps (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)" }).optional(),
  flavorWheelBody: z.enum(BODY_ADJECTIVES).optional(),
  toolsUsed: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Flavor Wheel (optional)
  flavorWheelCategories: z.record(z.string(), z.array(z.string())).optional(),
  flavorWheelAdjectives: z.array(z.string()).optional(),
});

export const shotSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  beanId: z.string().uuid(),
  grinderId: z.string().uuid(),
  machineId: z.string().uuid().nullable(),
  doseGrams: z.coerce.number(),
  yieldGrams: z.coerce.number(),
  grindLevel: z.coerce.number(),
  brewTempC: z.coerce.number().nullable(),
  preInfusionDuration: z.coerce.number().nullable(),
  brewPressure: z.coerce.number().nullable(),
  // Results
  brewTimeSecs: z.coerce.number().nullable(),
  yieldActualGrams: z.coerce.number().nullable(),
  estimateMaxPressure: z.coerce.number().nullable(),
  flowControl: z.coerce.number().nullable(),
  flowRate: z.coerce.number().nullable(),
  shotQuality: z.number(),
  rating: z.number().nullable(),
  flavorWheelBody: z.string().nullable(),
  toolsUsed: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  flavorWheelCategories: z.record(z.string(), z.array(z.string())).nullable(),
  flavorWheelAdjectives: z.array(z.string()).nullable(),
  isReferenceShot: z.boolean(),
  isHidden: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateShot = z.infer<typeof createShotSchema>;
export type Shot = z.infer<typeof shotSchema>;
