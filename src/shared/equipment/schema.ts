import * as z from "zod";

export const createGrinderSchema = z.object({
  name: z.string().min(1, "Grinder name is required"),
});

export const createMachineSchema = z.object({
  name: z.string().min(1, "Machine name is required"),
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

export type CreateGrinder = z.infer<typeof createGrinderSchema>;
export type CreateMachine = z.infer<typeof createMachineSchema>;
export type Grinder = z.infer<typeof grinderSchema>;
export type Machine = z.infer<typeof machineSchema>;
