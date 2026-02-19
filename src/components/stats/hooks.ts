"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";

export interface OverviewStats {
  totalShots: number;
  avgQuality: number | null;
  avgBrewRatio: number | null;
  mostUsedBean: { id: string; name: string | null; shotCount: number } | null;
  shotsThisWeek: number;
}

export interface BeanStats {
  bean: {
    id: string;
    name: string;
    roastLevel: string;
    origin: string | null;
    roaster: string | null;
  };
  shotCount: number;
  avgQuality: number | null;
  avgBrewRatio: number | null;
  avgBrewTime: number | null;
  avgGrindLevel: number | null;
  commonFlavors: { flavor: string; count: number }[];
}

export interface UserStats {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  shotCount: number;
  avgQuality: number | null;
  avgBrewRatio: number | null;
  mostUsedBean: { id: string; name: string | null; shotCount: number } | null;
  commonFlavors: { flavor: string; count: number }[];
}

export function useOverviewStats() {
  return useQuery<OverviewStats>({
    queryKey: ["stats", "overview"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.stats.overview.path);
      if (!res.ok) throw new Error("Failed to fetch overview stats");
      return res.json();
    },
  });
}

export function useBeanStats(beanId: string | undefined) {
  return useQuery<BeanStats>({
    queryKey: ["stats", "by-bean", beanId],
    queryFn: async () => {
      const byBeanRoute = ApiRoutes.stats.byBean as { path: string; beanId: { path: string } };
      const res = await fetch(
        resolvePath(byBeanRoute.beanId, { beanId: beanId! })
      );
      if (!res.ok) throw new Error("Failed to fetch bean stats");
      return res.json();
    },
    enabled: !!beanId,
  });
}

export function useUserStats(userId: string | undefined) {
  return useQuery<UserStats>({
    queryKey: ["stats", "by-user", userId],
    queryFn: async () => {
      const byUserRoute = ApiRoutes.stats.byUser as { path: string; userId: { path: string } };
      const res = await fetch(
        resolvePath(byUserRoute.userId, { userId: userId! })
      );
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
    enabled: !!userId,
  });
}
