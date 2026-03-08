import * as z from "zod";

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().url().nullable(),
  role: z.enum(["member", "admin", "super-admin"]).default("member"),
});

export type User = z.infer<typeof userSchema>;
