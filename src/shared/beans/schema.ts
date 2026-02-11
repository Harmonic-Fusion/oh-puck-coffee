import * as z from "zod";
import { ROAST_LEVELS, PROCESSING_METHODS } from "./constants";

export const createBeanSchema = z.object({
  name: z.string().min(1, "Bean name is required"),
  origin: z.string().optional(),
  roaster: z.string().optional(),
  processingMethod: z.enum(PROCESSING_METHODS).optional(),
  roastLevel: z.enum(ROAST_LEVELS),
  roastDate: z.coerce.date().optional(),
  isRoastDateBestGuess: z.boolean().optional(),
});

export const beanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  origin: z.string().nullable(),
  roaster: z.string().nullable(),
  processingMethod: z.string().nullable(),
  roastLevel: z.string(),
  roastDate: z.coerce.date().nullable(),
  isRoastDateBestGuess: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type CreateBean = z.infer<typeof createBeanSchema>;
export type Bean = z.infer<typeof beanSchema>;
