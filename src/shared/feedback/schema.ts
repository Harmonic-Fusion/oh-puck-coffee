import { z } from "zod";

export const createFeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
