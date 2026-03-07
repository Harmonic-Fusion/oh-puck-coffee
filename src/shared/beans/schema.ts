import * as z from "zod";
import { ROAST_LEVELS, PROCESSING_METHODS } from "./constants";

export const createBeanSchema = z.object({
  name: z.string().min(1, "Bean name is required"),
  origin: z.string().optional(),
  roaster: z.string().optional(),
  originId: z.number().int().positive().optional(),
  roasterId: z.number().int().positive().optional(),
  originDetails: z.string().optional(),
  processingMethod: z.enum(PROCESSING_METHODS).optional(),
  roastLevel: z.enum(ROAST_LEVELS),
  roastDate: z.coerce.date().optional(),
  openBagDate: z.coerce.date().optional(),
  isRoastDateBestGuess: z.boolean().optional(),
});

export const beanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  origin: z.string().nullable(),
  roaster: z.string().nullable(),
  originId: z.number().nullable(),
  roasterId: z.number().nullable(),
  originDetails: z.string().nullable(),
  processingMethod: z.string().nullable(),
  roastLevel: z.string(),
  roastDate: z.coerce.date().nullable(),
  isRoastDateBestGuess: z.boolean(),
  createdBy: z.string().uuid(),
  generalAccess: z.enum(["restricted", "anyone_with_link", "public"]),
  generalAccessShareShots: z.boolean(),
  shareSlug: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const userBeanSchema = z.object({
  beanId: z.string().uuid(),
  userId: z.string().uuid(),
  openBagDate: z.coerce.date().nullable(),
  shareMyShotsPublicly: z.boolean(),
  createdAt: z.coerce.date(),
});

export type CreateBean = z.infer<typeof createBeanSchema>;
export type Bean = z.infer<typeof beanSchema>;
export type UserBean = z.infer<typeof userBeanSchema>;
export type BeanWithUserData = Bean & { userBean: UserBean | null };

/** Request body for POST /api/beans/:id/shares */
export const createBeanShareSchema = z.object({
  userId: z.string().uuid(),
  reshareEnabled: z.boolean().default(false),
});

/** Request body for PATCH /api/beans/:id/general-access */
export const updateGeneralAccessSchema = z.object({
  generalAccess: z.enum(["restricted", "anyone_with_link", "public"]),
  generalAccessShareShots: z.boolean().optional(),
});

/** Request body for PATCH /api/beans/:id/shares/:shareId — update a person's access. */
export const updateBeanShareSchema = z.object({
  shareShotHistory: z.boolean().optional(),
  reshareEnabled: z.boolean().optional(),
});

export type CreateBeanShare = z.infer<typeof createBeanShareSchema>;
export type UpdateGeneralAccess = z.infer<typeof updateGeneralAccessSchema>;
export type UpdateBeanShare = z.infer<typeof updateBeanShareSchema>;
