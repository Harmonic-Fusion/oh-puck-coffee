import { z } from "zod";

/** Manual feedback from the feedback modal — message required; subject omitted (stored as empty). */
export const createFeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  subject: z
    .string()
    .max(200)
    .default("")
    .transform((s) => s.trim()),
  message: z.string().min(1).max(5000),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

const clientErrorFeedbackSchema = z.object({
  source: z.literal("client_error"),
  type: z.literal("bug"),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(100_000),
});

/** POST /api/feedback — manual form or automated client error JSON blob. */
export const createFeedbackRequestSchema = z.union([
  clientErrorFeedbackSchema,
  createFeedbackSchema,
]);

export type CreateFeedbackRequestInput = z.infer<
  typeof createFeedbackRequestSchema
>;
