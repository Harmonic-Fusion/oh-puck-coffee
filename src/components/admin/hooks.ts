"use client";

import { useQuery } from "@tanstack/react-query";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  extraParams?: Record<string, string>;
}

async function fetchAdminData<T>(
  endpoint: string,
  params: AdminQueryParams
): Promise<PaginatedResponse<T>> {
  const url = new URL(endpoint, window.location.origin);
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));
  if (params.search) url.searchParams.set("search", params.search);
  if (params.extraParams) {
    for (const [key, value] of Object.entries(params.extraParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
  }
  return res.json();
}

export function useAdminData<T>(endpoint: string, params: AdminQueryParams) {
  return useQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, params],
    queryFn: () => fetchAdminData<T>(endpoint, params),
  });
}
