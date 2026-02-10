"use client";

import { StatCard } from "@/components/stats/StatCard";
import { RatioChart } from "@/components/stats/RatioChart";
import { FlavorProfileChart } from "@/components/stats/FlavorProfileChart";
import { BeanComparisonTable } from "@/components/stats/BeanComparisonTable";
import { useOverviewStats } from "@/components/stats/hooks";
import { useShots } from "@/components/shots/hooks";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useOverviewStats();
  const { data: shots, isLoading: shotsLoading } = useShots({ limit: 100 });

  const isLoading = statsLoading || shotsLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Your espresso analytics at a glance
        </p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Shots"
            value={stats?.totalShots ?? 0}
            icon="☕"
          />
          <StatCard
            label="Avg Quality"
            value={stats?.avgQuality ? `${stats.avgQuality}/10` : null}
            icon="⭐"
          />
          <StatCard
            label="Avg Brew Ratio"
            value={stats?.avgBrewRatio ? `1:${stats.avgBrewRatio}` : null}
            icon="⚖️"
          />
          <StatCard
            label="Top Bean"
            value={stats?.mostUsedBean?.name ?? "—"}
            icon="🫘"
            subtext={
              stats?.mostUsedBean
                ? `${stats.mostUsedBean.shotCount} shots`
                : undefined
            }
          />
          <StatCard
            label="This Week"
            value={stats?.shotsThisWeek ?? 0}
            icon="📅"
            subtext="shots in last 7 days"
          />
        </div>
      )}

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {shotsLoading ? (
          <>
            <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
            <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
          </>
        ) : (
          <>
            <RatioChart shots={shots ?? []} />
            <FlavorProfileChart shots={shots ?? []} />
          </>
        )}
      </div>

      {/* Bean Comparison */}
      <div className="mt-6">
        {shotsLoading ? (
          <div className="h-16 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
        ) : (
          <BeanComparisonTable shots={shots ?? []} />
        )}
      </div>
    </div>
  );
}
