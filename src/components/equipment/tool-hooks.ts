"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Tool } from "@/shared/equipment/schema";
import { invalidateEquipmentQueries } from "./equipment-shared-hooks";

export function useTools() {
  return useQuery<Tool[]>({
    queryKey: ["tools", "mine"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.tools.path}?scope=mine`);
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json();
    },
  });
}

export function useToolsBrowse() {
  return useQuery<Tool[]>({
    queryKey: ["tools", "all"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.tools.path}?scope=all`);
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json();
    },
  });
}

export function useAddToolToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toolId: string) => {
      const res = await fetch(ApiRoutes.equipment.my.tools.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to add tool";
        throw new Error(msg);
      }
      return res.json() as Promise<Tool>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function useRemoveToolFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toolId: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.equipment.my.tools.toolId, { id: toolId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to remove tool";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}
