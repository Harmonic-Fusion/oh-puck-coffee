"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Grinder } from "@/shared/equipment/schema";
import { invalidateEquipmentQueries } from "./equipment-shared-hooks";

export function useGrinders() {
  return useQuery<Grinder[]>({
    queryKey: ["grinders", "mine"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.grinders.path}?scope=mine`);
      if (!res.ok) throw new Error("Failed to fetch grinders");
      return res.json();
    },
  });
}

export function useGrindersBrowse() {
  return useQuery<Grinder[]>({
    queryKey: ["grinders", "all"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.grinders.path}?scope=all`);
      if (!res.ok) throw new Error("Failed to fetch grinders");
      return res.json();
    },
  });
}

export function useAddGrinderToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      body:
        | { grinderId: string }
        | {
            name: string;
            brand?: string;
            specs?: Record<string, unknown>;
            imageId?: string;
          },
    ) => {
      const res = await fetch(ApiRoutes.equipment.my.grinders.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to add grinder";
        throw new Error(msg);
      }
      return res.json() as Promise<Grinder>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function useRemoveGrinderFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grinderId: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.equipment.my.grinders.grinderId, { id: grinderId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to remove grinder";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function usePatchGrinder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      grinderId: string;
      imageId?: string | null;
      name?: string;
      brand?: string | null;
      specs?: Record<string, unknown> | null;
    }) => {
      const body: Record<string, unknown> = {};
      if (params.imageId !== undefined) body.imageId = params.imageId;
      if (params.name !== undefined) body.name = params.name;
      if (params.brand !== undefined) body.brand = params.brand;
      if (params.specs !== undefined) body.specs = params.specs;
      const res = await fetch(
        resolvePath(ApiRoutes.equipment.grinders.grinderId, {
          id: params.grinderId,
        }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to update grinder";
        throw new Error(msg);
      }
      return res.json() as Promise<Grinder>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}
