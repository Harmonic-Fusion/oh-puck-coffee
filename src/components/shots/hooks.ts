"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { CreateShot } from "@/shared/shots/schema";
import type { ImageRecord } from "@/shared/images/schema";

export interface ShotWithJoins {
  id: string;
  userId: string;
  /** Count of images attached to this shot (from list/detail API). */
  imageCount?: number;
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
  sizeOz: string | null;
  yieldActualGrams: string | null;
  grindLevel: string;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  preInfusionWaitDuration: string | null;
  brewPressure: string | null;
  brewRatio: number | null;
  estimateMaxPressure: string | null;
  flowControl: string | null;
  flowRate: string | null;
  daysPostRoast: number | null;
  shotQuality: number | null;
  rating: number | null;
  bitter: number | null;
  sour: number | null;
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
  // New filter params
  beanIds?: string[];
  isHidden?: "all" | "yes" | "no";
  isReferenceShot?: boolean | null;
  grinderIds?: string[];
  machineIds?: string[];
  ratingMin?: number;
  ratingMax?: number;
  bitterMin?: number;
  bitterMax?: number;
  sourMin?: number;
  sourMax?: number;
  shotQualityMin?: number;
  shotQualityMax?: number;
  flavors?: string[];
  bodyTexture?: string[];
  adjectives?: string[];
  toolsUsed?: string[];
  ratioMin?: number;
  ratioMax?: number;
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
      
      // New filter params
      if (params?.beanIds && params.beanIds.length > 0) {
        searchParams.set("beanIds", params.beanIds.join(","));
      }
      if (params?.isHidden && params.isHidden !== "all") {
        searchParams.set("isHidden", params.isHidden);
      }
      if (params?.isReferenceShot !== undefined && params.isReferenceShot !== null) {
        searchParams.set("isReferenceShot", String(params.isReferenceShot));
      }
      if (params?.grinderIds && params.grinderIds.length > 0) {
        searchParams.set("grinderIds", params.grinderIds.join(","));
      }
      if (params?.machineIds && params.machineIds.length > 0) {
        searchParams.set("machineIds", params.machineIds.join(","));
      }
      if (params?.ratingMin !== undefined) {
        searchParams.set("ratingMin", String(params.ratingMin));
      }
      if (params?.ratingMax !== undefined) {
        searchParams.set("ratingMax", String(params.ratingMax));
      }
      if (params?.bitterMin !== undefined) {
        searchParams.set("bitterMin", String(params.bitterMin));
      }
      if (params?.bitterMax !== undefined) {
        searchParams.set("bitterMax", String(params.bitterMax));
      }
      if (params?.sourMin !== undefined) {
        searchParams.set("sourMin", String(params.sourMin));
      }
      if (params?.sourMax !== undefined) {
        searchParams.set("sourMax", String(params.sourMax));
      }
      if (params?.shotQualityMin !== undefined) {
        searchParams.set("shotQualityMin", String(params.shotQualityMin));
      }
      if (params?.shotQualityMax !== undefined) {
        searchParams.set("shotQualityMax", String(params.shotQualityMax));
      }
      if (params?.flavors && params.flavors.length > 0) {
        searchParams.set("flavors", params.flavors.join(","));
      }
      if (params?.bodyTexture && params.bodyTexture.length > 0) {
        searchParams.set("bodyTexture", params.bodyTexture.join(","));
      }
      if (params?.adjectives && params.adjectives.length > 0) {
        searchParams.set("adjectives", params.adjectives.join(","));
      }
      if (params?.toolsUsed && params.toolsUsed.length > 0) {
        searchParams.set("toolsUsed", params.toolsUsed.join(","));
      }
      if (params?.ratioMin !== undefined) {
        searchParams.set("ratioMin", String(params.ratioMin));
      }
      if (params?.ratioMax !== undefined) {
        searchParams.set("ratioMax", String(params.ratioMax));
      }

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

interface BeanShareSideLoadResponse {
  data: unknown;
  share: ShareLink[];
}

export function useCreateShareLink() {
  return useMutation<ShareLink, Error, string>({
    mutationFn: async (shotId: string) => {
      const params = new URLSearchParams();
      params.set("share", shotId);
      const res = await fetch(`${ApiRoutes.beans.path}?${params.toString()}`);
      if (!res.ok) {
        let errorMessage = "Failed to fetch share link";
        try {
          const text = await res.text();
          if (text) {
            const error = JSON.parse(text);
            errorMessage = error.error || errorMessage;
          } else {
            errorMessage = res.statusText || errorMessage;
          }
        } catch {
          // If response is not valid JSON, use status text or default message
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      let payload: unknown;
      try {
        const text = await res.text();
        if (!text) {
          throw new Error("Empty response from server");
        }
        payload = JSON.parse(text);
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Failed to parse response: ${err.message}`);
        }
        throw new Error("Failed to parse response");
      }
      
      const share = getShareFromBeansSideLoad(payload, shotId);
      if (!share) {
        throw new Error("Share link not found. The shot may not belong to you.");
      }
      return share;
    },
  });
}

function getShareFromBeansSideLoad(
  payload: unknown,
  shotId: string
): ShareLink | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as Partial<BeanShareSideLoadResponse>;
  if (!Array.isArray(response.share)) {
    return null;
  }

  const matchingShare = response.share.find(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.shotId === "string" &&
      item.shotId === shotId &&
      typeof item.userId === "string" &&
      typeof item.createdAt === "string"
  );

  return matchingShare ?? null;
}

interface ShotMetrics {
  yieldAccuracyPct: number | null;
  ratingDistribution: { rating: number; count: number }[];
  currentShotRating: number | null;
}

export function useShotMetrics(shotId: string | null) {
  return useQuery<ShotMetrics>({
    queryKey: ["shot-metrics", shotId],
    queryFn: async () => {
      if (!shotId) throw new Error("Shot ID is required");
      const url = resolvePath(ApiRoutes.stats.shotMetrics, {}, { shotId });
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch shot metrics");
      }
      return res.json();
    },
    enabled: !!shotId,
  });
}

export interface ShotImageListItem {
  id: string;
  url: string;
  thumbnailBase64: string;
  sizeBytes: number;
  attachedAt: string;
  createdAt: string;
}

export function useShotImages(shotId: string | null, enabled = true) {
  return useQuery<{ images: ShotImageListItem[] }>({
    queryKey: ["shots", shotId, "images"],
    queryFn: async () => {
      if (!shotId) throw new Error("Shot ID is required");
      const shotIdRoute = ApiRoutes.shots.shotId as { path: string; images: { path: string } };
      const url = resolvePath(shotIdRoute.images, { id: shotId });
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err === "object" && err && "error" in err && typeof (err as { error: unknown }).error === "string"
            ? (err as { error: string }).error
            : "Failed to fetch shot images",
        );
      }
      return res.json();
    },
    enabled: !!shotId && enabled,
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blob: Blob): Promise<ImageRecord> => {
      const form = new FormData();
      form.append("file", blob, "photo.jpg");
      const res = await fetch(ApiRoutes.images.path, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        let message = "Failed to upload image";
        try {
          const body = await res.json();
          if (body && typeof body.error === "string") message = body.error;
        } catch {
          message = res.statusText || message;
        }
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(
        resolvePath(ApiRoutes.images.imageId, { id: imageId }),
        { method: "DELETE" },
      );
      if (!res.ok) {
        let message = "Failed to delete image";
        try {
          const body = await res.json();
          if (body && typeof body.error === "string") message = body.error;
        } catch {
          message = res.statusText || message;
        }
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
    },
  });
}
