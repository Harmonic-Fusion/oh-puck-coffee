"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";
import { useOverviewStats } from "@/components/stats/hooks";
import { useShots } from "@/components/shots/hooks";
import { useBeans } from "@/components/beans/hooks";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import { useFilterParams } from "@/lib/use-filter-params";
import { StickyFilterBar } from "@/components/ui/StickyFilterBar";
import { useState } from "react";

// Dynamic imports to avoid "module factory is not available" (chunk/barrel/circular deps)
const StatCard = dynamic(
  () => import("@/components/stats/StatCard").then((m) => m.StatCard),
  { ssr: false },
);
const FlavorBubbleChart = dynamic(
  () => import("@/components/stats/FlavorBubbleChart").then((m) => m.FlavorBubbleChart),
  { ssr: false },
);
const ShotHeatmap = dynamic(
  () => import("@/components/stats/ShotHeatmap").then((m) => m.ShotHeatmap),
  { ssr: false },
);
const FlavorRatingsChart = dynamic(
  () => import("@/components/stats/FlavorRatingsChart").then((m) => m.FlavorRatingsChart),
  { ssr: false },
);
const BeanAgeChart = dynamic(
  () => import("@/components/stats/BeanAgeChart").then((m) => m.BeanAgeChart),
  { ssr: false },
);
const RoastRatingPanel = dynamic(
  () => import("@/components/stats/RoastRatingChart").then((m) => m.RoastRatingPanel),
  { ssr: false },
);

function StatsUpgradeSplash() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 text-5xl">📊</div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Unlock your espresso analytics
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Detailed analytics, trends, and insights across all your shots.
        </p>
        <ul className="mt-6 space-y-2 text-left text-sm text-stone-600 dark:text-stone-400">
          <li className="flex items-center gap-2">
            <span className="text-amber-600">&#10003;</span> Shot activity heatmap
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-600">&#10003;</span> Quality trends over time
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-600">&#10003;</span> Flavor profile breakdowns
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-600">&#10003;</span> Dial-in progress tracking
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-600">&#10003;</span> Bean comparison tables
          </li>
        </ul>
        <Link
          href={AppRoutes.billing.path}
          className="mt-8 inline-block rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}

function StatsPageContent() {
  const { data: session, status } = useSession();
  const canViewStats = hasEntitlement(
    session?.user.entitlements,
    Entitlements.STATS_VIEW,
  );

  const filterParams = useFilterParams();
  const { dateFrom, dateTo, beanIds } = filterParams;

  const { data: stats, isLoading: statsLoading } = useOverviewStats();
  const { data: beans = [] } = useBeans();
  const { data: shots, isLoading: shotsLoading } = useShots({
    limit: 500,
    dateFrom,
    dateTo,
    beanIds: beanIds.length > 0 ? beanIds : undefined,
  });
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  if (status === "loading") return null;

  if (!canViewStats) return <StatsUpgradeSplash />;

  const isLoading = statsLoading || shotsLoading;

  return (
    <div>
      {/* Page header */}
      <div className="px-4 pb-4 pt-4 sm:px-0">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Stats
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Your espresso analytics at a glance
        </p>
      </div>

      {/* Sticky filter bar (full-bleed, outside content padding) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <StickyFilterBar filterParams={filterParams} beans={beans} />
      </div>

      {/* Content */}
      <div className="pt-6">
        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard
              label="Total Shots"
              value={stats?.totalShots ?? 0}
              icon="☕"
            />
            <StatCard
              label="This Week"
              value={stats?.shotsThisWeek ?? 0}
              icon="📅"
              subtext="shots in last 7 days"
            />
            <StatCard
              label="Streak"
              value={stats?.currentStreak ? `${stats.currentStreak}d` : "—"}
              icon="🔥"
              subtext={stats?.currentStreak === 1 ? "day in a row" : "days in a row"}
            />
            <StatCard
              label="Beans"
              value={stats?.beansCount ?? 0}
              icon="🫘"
              subtext="distinct beans used"
            />
            <StatCard
              label="Avg Dose"
              value={stats?.avgDose != null ? `${stats.avgDose}g` : null}
              icon="⚖️"
            />
            <StatCard
              label="Avg Brew Ratio"
              value={stats?.avgBrewRatio != null ? `1:${stats.avgBrewRatio}` : null}
              icon="📐"
            />
            <StatCard
              label="Avg Rating"
              value={stats?.avgRating != null ? `${stats.avgRating}/5` : null}
              icon="⭐"
            />
          </div>
        )}

        {/* Shot Heatmap (full width) */}
        <div className="mt-6">
          {shotsLoading ? (
            <div className="h-40 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
          ) : (
            <ShotHeatmap shots={shots ?? []} />
          )}
        </div>

        {/* Primary Charts Row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {shotsLoading ? (
            <>
              <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
              <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
            </>
          ) : (
            <>
              <RoastRatingPanel shots={shots ?? []} />
              <BeanAgeChart shots={shots ?? []} />
            </>
          )}
        </div>

        {/* Secondary Charts Row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {shotsLoading ? (
            <>
              <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
              <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
            </>
          ) : (
            <>
              <FlavorBubbleChart shots={shots ?? []} />
              <FlavorRatingsChart shots={shots ?? []} />
            </>
          )}
        </div>

      </div>

      <FeedbackModal
        open={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense>
      <StatsPageContent />
    </Suspense>
  );
}
