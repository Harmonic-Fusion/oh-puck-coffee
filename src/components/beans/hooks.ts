"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { BeanWithUserData, CreateBean } from "@/shared/beans/schema";

export interface BeanWithCounts extends BeanWithUserData {
  shotCount: number;
  lastShotAt: Date | null;
  allShotsHidden: boolean;
  avgRating: number | null;
  bestRating: number | null;
  commonFlavors: string[];
}

export function useBeans(search?: string) {
  return useQuery<BeanWithUserData[]>({
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
      return res.json() as Promise<BeanWithUserData>;
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
      return res.json() as Promise<BeanWithUserData>;
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

/** Discoverable beans (public + shared with user) for search / add to collection. */
export interface PublicBeanSummary {
  id: string;
  name: string;
  origin: string | null;
  roaster: string | null;
  originDetails: string | null;
  processingMethod: string | null;
  roastLevel: string;
  roastDate: Date | string | null;
  isRoastDateBestGuess: boolean;
  shareSlug: string | null;
  createdAt: Date | string;
  /** True when authenticated and bean is already in user's collection. */
  inCollection?: boolean;
}

export function usePublicBeansSearch(search?: string, limit = 20) {
  return useQuery<PublicBeanSummary[]>({
    queryKey: ["shares", "beans", search ?? "", limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", String(limit));
      const res = await fetch(
        `${(ApiRoutes.shares.beans as { path: string }).path}?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch public beans");
      return res.json();
    },
  });
}

export function useAddBeanToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (beanId: string) => {
      const basePath = resolvePath(ApiRoutes.beans.beanId, { id: beanId });
      const res = await fetch(`${basePath}/add-to-collection`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add to collection");
      }
      return data as {
        message: string;
        bean: {
          id: string;
          name: string;
          origin?: string;
          roaster?: string;
          roastLevel: string;
          shareSlug?: string | null;
        };
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans"] });
    },
  });
}

export function useUpdateShareMyShots(beanId: string) {
  const queryClient = useQueryClient();
  const shareMyShotsPath = (
    ApiRoutes.beans.beanId as unknown as { shareMyShots: { path: string } }
  ).shareMyShots;
  return useMutation({
    mutationFn: async (shareMyShotsPublicly: boolean) => {
      const res = await fetch(resolvePath(shareMyShotsPath, { id: beanId }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareMyShotsPublicly }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Failed to update setting",
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans", beanId] });
      queryClient.invalidateQueries({ queryKey: ["beans"] });
    },
  });
}


export function useBean(id: string) {
  return useQuery<BeanWithUserData>({
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

export interface BeanShotContributor {
  userId: string;
  userName: string | null;
  userImage: string | null;
  isCurrentUser: boolean;
}

export interface BeanShotWithUser {
  id: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
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
}

export function useBeanShotsWithShared(beanId: string) {
  return useQuery<{
    shots: BeanShotWithUser[];
    contributors: BeanShotContributor[];
  }>({
    queryKey: ["shots", "bean", beanId, "with-shared"],
    queryFn: async () => {
      const beanShotsRoute = (
        ApiRoutes.beans.beanId as unknown as {
          shots: { path: string };
        }
      ).shots;
      const res = await fetch(resolvePath(beanShotsRoute, { id: beanId }));
      if (!res.ok) throw new Error("Failed to fetch bean shots");
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

export interface BeanWithComparisons extends BeanWithUserData {
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
      const res = await fetch(
        `${ApiRoutes.beans.compare.path}?${params.toString()}`,
      );
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

// ── Bean share hooks ─────────────────────────────────────────────────

export interface BeanShareItem {
  id: string;
  beanId: string;
  userId: string;
  invitedBy: string | null;
  status: "pending" | "accepted";
  shareShotHistory: boolean;
  reshareEnabled: boolean;
  createdAt: string;
  unsharedAt: string | null;
  userName: string | null;
  userImage: string | null;
}

export interface BeanSharesData {
  members: BeanShareItem[];
  createdBy: string;
  generalAccess: "restricted" | "anyone_with_link" | "public";
  generalAccessShareShots: boolean;
  shareSlug: string | null;
  isOwner: boolean;
}

export function useBeanShares(beanId: string) {
  return useQuery<BeanSharesData>({
    queryKey: ["beans", beanId, "shares"],
    queryFn: async () => {
      const sharesRoute = (
        ApiRoutes.beans.beanId as unknown as {
          shares: { path: string };
        }
      ).shares;
      const res = await fetch(resolvePath(sharesRoute, { id: beanId }));
      if (!res.ok) throw new Error("Failed to fetch bean shares");
      return res.json();
    },
    enabled: !!beanId,
  });
}

export function useCreateBeanShare(beanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      reshareEnabled: boolean;
    }) => {
      const sharesRoute = (
        ApiRoutes.beans.beanId as unknown as {
          shares: { path: string };
        }
      ).shares;
      const res = await fetch(resolvePath(sharesRoute, { id: beanId }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create share");
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans", beanId, "shares"] });
      queryClient.invalidateQueries({ queryKey: ["beans", beanId] });
    },
  });
}

export function useDeleteBeanShare(beanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shareId: string) => {
      const shareIdRoute = (
        ApiRoutes.beans.beanId as unknown as {
          shareId: { path: string };
        }
      ).shareId;
      const res = await fetch(
        resolvePath(shareIdRoute, { id: beanId, shareId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to delete share");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans", beanId, "shares"] });
      queryClient.invalidateQueries({ queryKey: ["beans", beanId] });
      queryClient.invalidateQueries({ queryKey: ["shares", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["beans"] });
      queryClient.invalidateQueries({ queryKey: ["beans", "list"] });
    },
  });
}

export function useUpdateBeanShare(beanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shareId,
      shareShotHistory,
      reshareEnabled,
    }: {
      shareId: string;
      shareShotHistory?: boolean;
      reshareEnabled?: boolean;
    }) => {
      const shareIdRoute = (
        ApiRoutes.beans.beanId as unknown as {
          shareId: { path: string };
        }
      ).shareId;
      const res = await fetch(
        resolvePath(shareIdRoute, { id: beanId, shareId }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(shareShotHistory !== undefined && { shareShotHistory }),
            ...(reshareEnabled !== undefined && { reshareEnabled }),
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update share");
      }
      return body as BeanShareItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans", beanId, "shares"] });
      queryClient.invalidateQueries({ queryKey: ["beans", beanId] });
    },
  });
}

export function useUpdateGeneralAccess(beanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      generalAccess: "restricted" | "anyone_with_link" | "public";
      generalAccessShareShots?: boolean;
    }) => {
      const generalAccessRoute = (
        ApiRoutes.beans.beanId as unknown as {
          generalAccess: { path: string };
        }
      ).generalAccess;
      const res = await fetch(resolvePath(generalAccessRoute, { id: beanId }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update general access");
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans", beanId, "shares"] });
      queryClient.invalidateQueries({ queryKey: ["beans", beanId] });
    },
  });
}

export interface UserSearchResult {
  id: string;
  name: string | null;
  image: string | null;
}

export function useUserSearch(query: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ["users", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await fetch(
        `${ApiRoutes.users.path}?search=${encodeURIComponent(query.trim())}`,
      );
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: query.trim().length >= 2,
  });
}

// ── Share invites (receiver) ─────────────────────────────────────────────

export interface ShareInvite {
  id: string;
  beanId: string;
  invitedBy: string | null;
  shareShotHistory: boolean;
  reshareEnabled: boolean;
  createdAt: string;
  beanName: string;
  beanRoaster: string | null;
  beanOrigin: string | null;
  sharerName: string | null;
  sharerImage: string | null;
}

export function useShareInvites() {
  const invitesRoute = (
    ApiRoutes.shares as unknown as { invites: { path: string } }
  ).invites;
  return useQuery<ShareInvite[]>({
    queryKey: ["shares", "invites"],
    queryFn: async () => {
      const res = await fetch(invitesRoute.path);
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
  });
}

export function useAcceptBeanShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      beanId,
      shareId,
    }: {
      beanId: string;
      shareId: string;
    }) => {
      const acceptPath = (
        ApiRoutes.beans.beanId as unknown as {
          shareId: { accept: { path: string } };
        }
      ).shareId.accept;
      const res = await fetch(
        resolvePath(acceptPath, { id: beanId, shareId }),
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to accept share");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["beans"] });
      queryClient.invalidateQueries({ queryKey: ["beans", "list"] });
    },
  });
}

/** Decline a pending share (receiver only). Uses same DELETE endpoint as creator revoke. */
export function useDuplicateBean() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      beanId,
      includeShots,
    }: {
      beanId: string;
      includeShots: boolean;
    }) => {
      const duplicateRoute = (
        ApiRoutes.beans.beanId as unknown as {
          duplicate: { path: string };
        }
      ).duplicate;
      const res = await fetch(resolvePath(duplicateRoute, { id: beanId }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeShots }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to duplicate bean");
      }
      return data as BeanWithUserData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beans"] });
    },
  });
}

export function useDeclineBeanShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      beanId,
      shareId,
    }: {
      beanId: string;
      shareId: string;
    }) => {
      const shareIdRoute = (
        ApiRoutes.beans.beanId as unknown as { shareId: { path: string } }
      ).shareId;
      const res = await fetch(
        resolvePath(shareIdRoute, { id: beanId, shareId }),
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to decline");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["beans"] });
      queryClient.invalidateQueries({ queryKey: ["beans", "list"] });
    },
  });
}
