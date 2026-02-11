"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Bean, CreateBean } from "@/shared/beans/schema";

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
      const res = await fetch(resolvePath(ApiRoutes.bean.path, { id }), {
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
