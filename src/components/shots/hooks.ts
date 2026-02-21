"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";

export interface ShotWithJoins {
  id: string;
  userId: string;
  userName: string | null;
  beanId: string;
  beanName: string | null;
  beanRoastDate: string | null;
  beanRoastLevel: string | null;
  grinderId: string;
  grinderName: string | null;
  machineId: string | null;
  machineName: string | null;
  doseGrams: string;
  yieldGrams: string;
  yieldActualGrams: string | null;
  grindLevel: string;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  brewRatio: number | null;
  estimateMaxPressure: string | null;
  flowControl: string | null;
  flowRate: string | null;
  daysPostRoast: number | null;
  shotQuality: number;
  rating: number | null;
  toolsUsed: string[] | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  isReferenceShot: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShotsQueryParams {
  userId?: string;
  beanId?: string;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useShots(params?: ShotsQueryParams) {
  return useQuery<ShotWithJoins[]>({
    queryKey: ["shots", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.userId) searchParams.set("userId", params.userId);
      if (params?.beanId) searchParams.set("beanId", params.beanId);
      if (params?.sort) searchParams.set("sort", params.sort);
      if (params?.order) searchParams.set("order", params.order);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
      if (params?.dateTo) searchParams.set("dateTo", params.dateTo);

      const query = searchParams.toString();
      const url = query
        ? `${ApiRoutes.shots.path}?${query}`
        : ApiRoutes.shots.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shots");
      return res.json();
    },
  });
}

export function useCreateShot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateShot) => {
      const res = await fetch(ApiRoutes.shots.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let errorMessage = "Failed to create shot";
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // If response is not valid JSON, use status text or default message
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}

export function useLastShot() {
  return useQuery<ShotWithJoins | null>({
    queryKey: ["shots", "last"],
    queryFn: async () => {
      const res = await fetch(
        `${ApiRoutes.shots.path}?limit=1&sort=createdAt&order=desc`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] || null;
    },
    staleTime: Infinity,
  });
}

export function useToggleReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const shotIdRoute = ApiRoutes.shots.shotId as { path: string; reference: { path: string }; hidden: { path: string } };
      const res = await fetch(
        resolvePath(shotIdRoute.reference, { id }),
        { method: "PATCH" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle reference");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}

export function useToggleHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const shotIdRoute = ApiRoutes.shots.shotId as { path: string; reference: { path: string }; hidden: { path: string } };
      const res = await fetch(
        resolvePath(shotIdRoute.hidden, { id }),
        { method: "PATCH" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle hidden");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}

export function useDeleteShot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(resolvePath(ApiRoutes.shots.shotId, { id }), {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete shot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}

export function useShot(id: string | null) {
  return useQuery<ShotWithJoins>({
    queryKey: ["shots", id],
    queryFn: async () => {
      if (!id) throw new Error("Shot ID is required");
      const res = await fetch(resolvePath(ApiRoutes.shots.shotId, { id }));
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch shot");
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateShot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateShot }) => {
      const res = await fetch(resolvePath(ApiRoutes.shots.shotId, { id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update shot");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
      queryClient.invalidateQueries({ queryKey: ["shots", variables.id] });
    },
  });
}

interface ShareLink {
  id: string;
  shotId: string;
  userId: string;
  createdAt: string;
}

export function useCreateShareLink() {
  return useMutation<ShareLink, Error, string>({
    mutationFn: async (shotId: string) => {
      const res = await fetch(ApiRoutes.shares.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create share link");
      }
      return res.json();
    },
  });
}
