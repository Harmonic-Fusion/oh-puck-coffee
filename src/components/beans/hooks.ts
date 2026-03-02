"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Bean, CreateBean } from "@/shared/beans/schema";

export interface BeanWithCounts extends Bean {
  shotCount: number;
  lastShotAt: Date | null;
  allShotsHidden: boolean;
  avgRating: number | null;
  bestRating: number | null;
  commonFlavors: string[];
}

export function useBeans(search?: string) {
  return useQuery<Bean[]>({
    queryKey: ["beans", search],
    queryFn: async () => {
      const url = search
        ? `${ApiRoutes.beans.path}?search=${encodeURIComponent(search)}`
        : ApiRoutes.beans.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch beans");
      return res.json();
    },
  });
}

export function useCreateBean() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBean) => {
      const res = await fetch(ApiRoutes.beans.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create bean");
      }
      return res.json() as Promise<Bean>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans"] });
    },
  });
}

export function useUpdateBean() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateBean }) => {
      const res = await fetch(resolvePath(ApiRoutes.beans.beanId, { id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update bean");
      }
      return res.json() as Promise<Bean>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans"] });
    },
  });
}

export function useBeansList() {
  return useQuery<BeanWithCounts[]>({
    queryKey: ["beans", "list"],
    queryFn: async () => {
      const res = await fetch(`${ApiRoutes.beans.path}?withCounts=true`);
      if (!res.ok) throw new Error("Failed to fetch beans");
      return res.json();
    },
  });
}

export function useBean(id: string) {
  return useQuery<Bean>({
    queryKey: ["beans", id],
    queryFn: async () => {
      const res = await fetch(resolvePath(ApiRoutes.beans.beanId, { id }));
      if (!res.ok) throw new Error("Failed to fetch bean");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useBeanShots(beanId: string) {
  return useQuery({
    queryKey: ["shots", "bean", beanId],
    queryFn: async () => {
      const params = new URLSearchParams({ beanId, isHidden: "all" });
      const res = await fetch(`${ApiRoutes.shots.path}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch shots for bean");
      return res.json();
    },
    enabled: !!beanId,
  });
}

export interface BeanCompareShot {
  id: string;
  beanId: string;
  doseGrams: string | null;
  yieldGrams: string | null;
  grindLevel: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  flowRate: string | null;
  shotQuality: string | null;
  rating: string | null;
  bitter: string | null;
  sour: string | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  isReferenceShot: boolean;
  isHidden: boolean;
  createdAt: string;
  brewRatio: number | null;
  daysPostRoast: number | null;
  shotIndex: number;
}

export interface BeanWithComparisons extends Bean {
  shotComparisons: {
    shotCount: number;
    minShotNumber: number;
    maxShotNumber: number;
    bestRating: number | null;
    avgRating: number | null;
    avgQuality: number | null;
    firstShotDate: string | null;
    lastShotDate: string | null;
    flavorStats: { flavor: string; avgRating: number; count: number }[];
    shots: BeanCompareShot[];
  };
}

export function useBeansCompare(beanIds: string[]) {
  return useQuery<{ beans: BeanWithComparisons[] }>({
    queryKey: ["beans", "compare", beanIds.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams({ beanIds: beanIds.join(",") });
      const res = await fetch(`${ApiRoutes.beans.compare.path}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch bean comparisons");
      return res.json();
    },
    enabled: beanIds.length > 0,
  });
}

interface BeanSearchResult {
  id: string;
  name: string;
}

export function useBeansSearch(search?: string, limit?: number) {
  return useQuery<BeanSearchResult[]>({
    queryKey: ["beans", "search", search, limit],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set("search", search);
      if (limit) searchParams.set("limit", String(limit));
      
      const url = searchParams.toString()
        ? `${ApiRoutes.beans.search.path}?${searchParams.toString()}`
        : ApiRoutes.beans.search.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search beans");
      return res.json();
    },
    enabled: true, // Always enabled for filter prepopulation
  });
}
