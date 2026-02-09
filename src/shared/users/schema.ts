import * as z from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().url().nullable(),
});

export type User = z.infer<typeof userSchema>;
