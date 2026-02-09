"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiRoutes } from "@/app/routes";
import type { User } from "@/shared/users/schema";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.users.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}
