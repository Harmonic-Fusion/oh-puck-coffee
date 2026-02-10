import * as z from "zod";

export const createGrinderSchema = z.object({
  name: z.string().min(1, "Grinder name is required"),
});

export const createMachineSchema = z.object({
  name: z.string().min(1, "Machine name is required"),
});

export const createToolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
});

export const grinderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
});

export const machineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
});

export const toolSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type CreateGrinder = z.infer<typeof createGrinderSchema>;
export type CreateMachine = z.infer<typeof createMachineSchema>;
export type CreateTool = z.infer<typeof createToolSchema>;
export type Grinder = z.infer<typeof grinderSchema>;
export type Machine = z.infer<typeof machineSchema>;
export type Tool = z.infer<typeof toolSchema>;
