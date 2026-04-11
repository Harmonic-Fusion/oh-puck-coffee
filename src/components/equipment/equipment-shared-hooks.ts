"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiRoutes } from "@/app/routes";
import type { ImageRecord } from "@/shared/images/schema";

export function invalidateEquipmentQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["grinders"] });
  queryClient.invalidateQueries({ queryKey: ["machines"] });
  queryClient.invalidateQueries({ queryKey: ["tools"] });
  queryClient.invalidateQueries({ queryKey: ["equipment", "items"] });
}

export function useUploadEquipmentImage() {
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
      invalidateEquipmentQueries(queryClient);
    },
  });
}
