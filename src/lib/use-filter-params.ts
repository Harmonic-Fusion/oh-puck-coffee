"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseISO, isValid } from "date-fns";
import type { DateRange } from "@/components/ui/date-range-picker";

export interface FilterParams {
  dateRange: DateRange | undefined;
  beanIds: string[];
  dateFrom: string | undefined;
  dateTo: string | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  setBeanIds: (ids: string[]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * URL-backed filter state for date range and bean IDs.
 * Persists across navigation between /stats and /shots via search params.
 */
export function useFilterParams(): FilterParams {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateRange = useMemo<DateRange | undefined>(() => {
    const fromStr = searchParams.get("dateFrom");
    const toStr = searchParams.get("dateTo");
    if (!fromStr && !toStr) return undefined;
    const from = fromStr ? parseISO(fromStr) : undefined;
    const to = toStr ? parseISO(toStr) : undefined;
    return {
      from: from && isValid(from) ? from : undefined,
      to: to && isValid(to) ? to : undefined,
    };
  }, [searchParams]);

  const beanIds = useMemo<string[]>(() => {
    const raw = searchParams.get("beanIds");
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);

  const dateFrom = dateRange?.from
    ? dateRange.from.toISOString().slice(0, 10)
    : undefined;
  const dateTo = dateRange?.to
    ? dateRange.to.toISOString().slice(0, 10)
    : undefined;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const search = params.toString();
      router.replace(search ? `?${search}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      updateParams({
        dateFrom: range?.from ? range.from.toISOString().slice(0, 10) : null,
        dateTo: range?.to ? range.to.toISOString().slice(0, 10) : null,
      });
    },
    [updateParams],
  );

  const setBeanIds = useCallback(
    (ids: string[]) => {
      updateParams({ beanIds: ids.length > 0 ? ids.join(",") : null });
    },
    [updateParams],
  );

  const resetFilters = useCallback(() => {
    updateParams({ dateFrom: null, dateTo: null, beanIds: null });
  }, [updateParams]);

  const hasActiveFilters = beanIds.length > 0 || !!dateRange?.from || !!dateRange?.to;

  return {
    dateRange,
    beanIds,
    dateFrom,
    dateTo,
    setDateRange,
    setBeanIds,
    resetFilters,
    hasActiveFilters,
  };
}
