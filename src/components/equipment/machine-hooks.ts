"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Machine } from "@/shared/equipment/schema";
import { invalidateEquipmentQueries } from "./equipment-shared-hooks";

export function useMachines() {
  return useQuery<Machine[]>({
    queryKey: ["machines", "mine"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.machines.path}?scope=mine`);
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
  });
}

export function useMachinesBrowse() {
  return useQuery<Machine[]>({
    queryKey: ["machines", "all"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.equipment.machines.path}?scope=all`);
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
  });
}

export function useAddMachineToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      body:
        | { machineId: string }
        | {
            name: string;
            brand?: string;
            specs?: Record<string, unknown>;
            imageId?: string;
          },
    ) => {
      const res = await fetch(ApiRoutes.equipment.my.machines.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to add machine";
        throw new Error(msg);
      }
      return res.json() as Promise<Machine>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function useRemoveMachineFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (machineId: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.equipment.my.machines.machineId, { id: machineId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody && typeof errBody.error === "string"
            ? errBody.error
            : "Failed to remove machine";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}

export function usePatchMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      machineId: string;
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
        resolvePath(ApiRoutes.equipment.machines.machineId, {
          id: params.machineId,
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
            : "Failed to update machine";
        throw new Error(msg);
      }
      return res.json() as Promise<Machine>;
    },
    onSuccess: () => {
      invalidateEquipmentQueries(queryClient);
    },
  });
}
