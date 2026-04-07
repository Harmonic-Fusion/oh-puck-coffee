import * as z from "zod";

/** Stored on `chats.type` for metered shot-suggestion requests. */
export const SHOT_SUGGESTION_CHAT_TYPE = "shot_suggestion" as const;

export const createAiChatRequestSchema = z.object({
  beanId: z.string().min(1, "beanId is required"),
});

export type CreateAiChatRequest = z.infer<typeof createAiChatRequestSchema>;

export const createAiChatResponseSchema = z.object({
  suggestion: z.string(),
  chatId: z.string(),
  usedThisWeek: z.number().int().nonnegative(),
  weeklyLimit: z.number().int().positive(),
});

export type CreateAiChatResponse = z.infer<typeof createAiChatResponseSchema>;

export const aiChatUsageResponseSchema = z.object({
  usedThisWeek: z.number().int().nonnegative(),
  weeklyLimit: z.number().int().positive(),
  /** ISO 8601 — Monday 00:00:00.000Z for the current usage window */
  weekStartsAt: z.string(),
});

export type AiChatUsageResponse = z.infer<typeof aiChatUsageResponseSchema>;

// ── Chat history ─────────────────────────────────────────────────────

export const aiChatHistoryItemSchema = z.object({
  chatId: z.string(),
  suggestion: z.string(),
  createdAt: z.string(),
});

export type AiChatHistoryItem = z.infer<typeof aiChatHistoryItemSchema>;

export const aiChatHistoryResponseSchema = z.object({
  items: z.array(aiChatHistoryItemSchema),
});

export type AiChatHistoryResponse = z.infer<typeof aiChatHistoryResponseSchema>;

/** Background memory refresh (not metered). */
export const aiMemoryRefreshRequestSchema = z
  .object({
    userId: z.string().min(1).optional(),
    beanId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.userId || v.beanId), {
    message: "Provide at least one of userId or beanId",
  });

export type AiMemoryRefreshRequest = z.infer<typeof aiMemoryRefreshRequestSchema>;

export const aiMemoryRefreshResponseSchema = z.object({
  ok: z.literal(true),
  refreshed: z.object({
    user: z.boolean().optional(),
    bean: z.boolean().optional(),
  }),
});

export type AiMemoryRefreshResponse = z.infer<typeof aiMemoryRefreshResponseSchema>;
