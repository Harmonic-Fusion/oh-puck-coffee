"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes } from "@/app/routes";
import type {
  Grinder,
  Machine,
  Tool,
  CreateGrinder,
  CreateMachine,
  CreateTool,
} from "@/shared/equipment/schema";

export function useGrinders() {
  return useQuery<Grinder[]>({
    queryKey: ["grinders"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.grinders.path);
      if (!res.ok) throw new Error("Failed to fetch grinders");
      return res.json();
    },
  });
}

export function useCreateGrinder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGrinder) => {
      const res = await fetch(ApiRoutes.grinders.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create grinder");
      }
      return res.json() as Promise<Grinder>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grinders"] });
    },
  });
}

export function useMachines() {
  return useQuery<Machine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.machines.path);
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
  });
}

export function useCreateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMachine) => {
      const res = await fetch(ApiRoutes.machines.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create machine");
      }
      return res.json() as Promise<Machine>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
  });
}

export function useTools() {
  return useQuery<Tool[]>({
    queryKey: ["tools"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.tools.path);
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json();
    },
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTool) => {
      const res = await fetch(ApiRoutes.tools.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create tool");
      }
      return res.json() as Promise<Tool>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
    },
  });
}
