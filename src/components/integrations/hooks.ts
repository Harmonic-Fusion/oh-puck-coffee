"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Integration } from "@/shared/integrations/schema";

export function useIntegration() {
  return useQuery<Integration | null>({
    queryKey: ["integration"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.integrations.path);
      if (!res.ok) throw new Error("Failed to fetch integration");
      return res.json();
    },
  });
}

export function useLinkSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (spreadsheetId: string) => {
      const res = await fetch(ApiRoutes.integrations.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to link sheet");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration"] });
    },
  });
}

export function useUnlinkSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.integration.path, { id }),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unlink sheet");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration"] });
    },
  });
}

export function useValidateSheet() {
  return useMutation({
    mutationFn: async (spreadsheetId: string) => {
      const res = await fetch(ApiRoutes.integrationsValidate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      return data as { valid: boolean; title: string };
    },
  });
}
