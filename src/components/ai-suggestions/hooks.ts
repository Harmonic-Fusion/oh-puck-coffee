"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes } from "@/app/routes";
import type {
  AiChatHistoryResponse,
  AiChatUsageResponse,
  CreateAiChatResponse,
} from "@/shared/ai-suggestions/schema";

const chatsUrl = ApiRoutes.chats.path;
const usageUrl = ApiRoutes.chats.usage.path;

export function useAiSuggestionUsage() {
  return useQuery<AiChatUsageResponse>({
    queryKey: ["ai", "chats", "usage"],
    queryFn: async () => {
      const res = await fetch(usageUrl);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err === "object" && err && "error" in err
            ? String((err as { error: unknown }).error)
            : "Failed to load AI usage",
        );
      }
      return res.json();
    },
  });
}

export function useAiSuggestionHistory(beanId: string) {
  return useQuery<AiChatHistoryResponse>({
    queryKey: ["ai", "chats", "history", beanId],
    queryFn: async () => {
      const res = await fetch(`${chatsUrl}?beanId=${encodeURIComponent(beanId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err === "object" && err && "error" in err
            ? String((err as { error: unknown }).error)
            : "Failed to load suggestion history",
        );
      }
      return res.json();
    },
  });
}

export function useRequestAiSuggestion(beanId: string) {
  const queryClient = useQueryClient();

  return useMutation<CreateAiChatResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(chatsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beanId }),
      });

      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Request failed (${res.status})`;
        const err = new Error(message) as Error & {
          code?: string;
          usedThisWeek?: number;
          weeklyLimit?: number;
        };
        if (
          typeof data === "object" &&
          data &&
          "code" in data &&
          typeof (data as { code: unknown }).code === "string"
        ) {
          err.code = (data as { code: string }).code;
        }
        if (
          typeof data === "object" &&
          data &&
          "usedThisWeek" in data &&
          typeof (data as { usedThisWeek: unknown }).usedThisWeek === "number"
        ) {
          err.usedThisWeek = (data as { usedThisWeek: number }).usedThisWeek;
        }
        if (
          typeof data === "object" &&
          data &&
          "weeklyLimit" in data &&
          typeof (data as { weeklyLimit: unknown }).weeklyLimit === "number"
        ) {
          err.weeklyLimit = (data as { weeklyLimit: number }).weeklyLimit;
        }
        throw err;
      }

      return data as CreateAiChatResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "chats", "usage"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "chats", "history", beanId] });
    },
  });
}
