"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Grinder } from "@/shared/equipment/schema";
import type { UserGearExtraType } from "@/shared/equipment/schema";
import { invalidateEquipmentQueries } from "./equipment-shared-hooks";

export function useExtraGearList(type: UserGearExtraType) {
  return useQuery<Grinder[]>({
    queryKey: ["equipment", "items", type, "mine"],
    queryFn: async () => {
      const url = `${ApiRoutes.equipment.items.path}?type=${encodeURIComponent(type)}&scope=mine`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch equipment");
      return res.json();
    },
  });
}

export function useExtraGearBrowse(type: UserGearExtraType) {
  return useQuery<Grinder[]>({
    queryKey: ["equipment", "items", type, "all"],
    queryFn: async () => {
      const url = `${ApiRoutes.equipment.items.path}?type=${encodeURIComponent(type)}&scope=all`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch equipment");
      return res.json();
    },
  });
}

export function useAddExtraGearToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      equipmentType: UserGearExtraType;
    } & (
      | { equipmentId: string }
      | { name: string; brand?: string; specs?: Record<string, unknown> }
    )) => {
      const res = await fetch(ApiRoutes.equipment.my.items.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to add equipment";
        throw new Error(msg);
      }
      return res.json() as Promise<Grinder>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function useRemoveExtraGearFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (equipmentId: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.equipment.my.items.itemId, { id: equipmentId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to remove equipment";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function usePatchExtraGearItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      equipmentId: string;
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
        resolvePath(ApiRoutes.equipment.items.itemId, {
          id: params.equipmentId,
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
            : "Failed to update equipment";
        throw new Error(msg);
      }
      return res.json() as Promise<Grinder>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}
