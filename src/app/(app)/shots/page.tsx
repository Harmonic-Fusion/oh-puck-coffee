"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useShots } from "@/components/shots/hooks";
import { AppRoutes, ApiRoutes } from "@/app/routes";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { ShotsListView } from "@/components/shots/ShotsListView";

export default function ShotsPage() {
  const { data: shots, isLoading } = useShots();
  const data = useMemo(() => shots ?? [], [shots]);

  const { data: shotCountData } = useQuery<{ total: number; limit: number | null }>({
    queryKey: ["shots", "count"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.shots.count.path);
      if (!res.ok) throw new Error("Failed to fetch shot count");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Shots
        </h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">☕</span>
        <h3 className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-300">
          No shots yet
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Log your first espresso shot to see it here.
        </p>
        <Link
          href={AppRoutes.log.path}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 hover:bg-amber-800 bg-amber-700"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Add a shot
        </Link>
      </div>
    );
  }

  return <ShotsListView shots={data} shotCount={shotCountData} />;
}
