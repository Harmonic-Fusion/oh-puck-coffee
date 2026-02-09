import * as z from "zod";
import { FLAVOR_PROFILES } from "./constants";
import { TOOLS } from "../equipment/constants";
import { BODY_ADJECTIVES } from "../flavor-wheel/constants";

export const createShotSchema = z.object({
  beanId: z.string().uuid(),
  grinderId: z.string().uuid(),
  machineId: z.string().uuid().optional(),
  doseGrams: z.coerce.number().positive().max(50),
  yieldGrams: z.coerce.number().positive().max(100),
  grindLevel: z.coerce.number().nonnegative("Grind level is required"),
  brewTimeSecs: z.coerce.number().positive().max(120),
  brewTempC: z.coerce.number().positive().max(100).optional(),
  preInfusionDuration: z.coerce.number().nonnegative().max(60).optional(),
  shotQuality: z.coerce.number().int().min(1).max(10),
  flavorProfile: z.array(z.enum(FLAVOR_PROFILES)).optional(),
  flavorWheelBody: z.enum(BODY_ADJECTIVES).optional(),
  toolsUsed: z.array(z.enum(TOOLS)).optional(),
  notes: z.string().optional(),
  // Section 4 — Flavor Wheel (optional)
  flavorWheelCategories: z.record(z.string(), z.array(z.string())).optional(),
  flavorWheelAdjectives: z.array(z.string()).optional(),
  overallPreference: z.coerce.number().min(1).max(5).optional(),
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
  brewTimeSecs: z.coerce.number(),
  brewTempC: z.coerce.number().nullable(),
  preInfusionDuration: z.coerce.number().nullable(),
  flowRate: z.coerce.number().nullable(),
  shotQuality: z.number(),
  flavorProfile: z.array(z.string()).nullable(),
  flavorWheelBody: z.string().nullable(),
  toolsUsed: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  flavorWheelCategories: z.record(z.string(), z.array(z.string())).nullable(),
  flavorWheelAdjectives: z.array(z.string()).nullable(),
  overallPreference: z.coerce.number().nullable(),
  isReferenceShot: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateShot = z.infer<typeof createShotSchema>;
export type Shot = z.infer<typeof shotSchema>;
