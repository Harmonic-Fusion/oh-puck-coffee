import * as z from "zod";
import { ROAST_LEVELS, PROCESSING_METHODS } from "./constants";

export const createBeanSchema = z.object({
  name: z.string().min(1, "Bean name is required"),
  origin: z.string().optional(),
  roaster: z.string().optional(),
  originId: z.string().optional(),
  roasterId: z.string().optional(),
  originDetails: z.string().optional(),
  processingMethod: z.enum(PROCESSING_METHODS).optional(),
  roastLevel: z.enum(ROAST_LEVELS),
  roastDate: z.coerce.date().optional(),
  openBagDate: z.coerce.date().optional(),
  isRoastDateBestGuess: z.boolean().optional(),
});

export const beanSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  originId: z.string().nullable(),
  roasterId: z.string().nullable(),
  origin: z.string().nullable().optional(),
  roaster: z.string().nullable().optional(),
  originDetails: z.string().nullable(),
  processingMethod: z.string().nullable(),
  roastLevel: z.string(),
  roastDate: z.coerce.date().nullable(),
  isRoastDateBestGuess: z.boolean(),
  generalAccess: z.enum(["restricted", "anyone_with_link"]),
  shareSlug: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  updatedBy: z.string().nullable(),
});

/** Schema for a beans_share row (participation: owner, pending, accepted, or self). */
export const beanShareRowSchema = z.object({
  id: z.string().min(1),
  beanId: z.string().min(1),
  userId: z.string().min(1),
  invitedBy: z.string().nullable(),
  status: z.enum(["owner", "pending", "accepted", "self", "unfollowed"]),
  shotHistoryAccess: z.enum(["none", "restricted", "anyone_with_link"]),
  reshareAllowed: z.boolean(),
  beansOpenDate: z.coerce.date().nullable(),
  openBagDate: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateBean = z.infer<typeof createBeanSchema>;
export type Bean = z.infer<typeof beanSchema>;
export type BeanShareRow = z.infer<typeof beanShareRowSchema>;
/** Bean plus the current user's participation row (beans_share). Property name kept as userBean for Phase 5 migration. */
export type BeanWithUserData = Bean & { userBean: BeanShareRow | null };

/** Request body for POST /api/beans/:id/shares */
export const createBeanShareSchema = z.object({
  userId: z.string().min(1),
  reshareAllowed: z.boolean().default(false),
});

/** Request body for PATCH /api/beans/:id/general-access */
export const updateGeneralAccessSchema = z.object({
  generalAccess: z.enum(["restricted", "anyone_with_link"]),
});

/** Request body for PATCH /api/beans/:id/shares/:shareId — update a person's access. */
export const updateBeanShareSchema = z.object({
  shotHistoryAccess: z.enum(["none", "restricted", "anyone_with_link"]).optional(),
  reshareAllowed: z.boolean().optional(),
});

export type CreateBeanShare = z.infer<typeof createBeanShareSchema>;
export type UpdateGeneralAccess = z.infer<typeof updateGeneralAccessSchema>;
export type UpdateBeanShare = z.infer<typeof updateBeanShareSchema>;
