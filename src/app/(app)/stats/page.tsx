"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";
import { StatCard } from "@/components/stats/StatCard";
import { FlavorProfileChart } from "@/components/stats/FlavorProfileChart";
import { BeanComparisonTable } from "@/components/stats/BeanComparisonTable";
import { ShotQualityChart } from "@/components/stats/ShotQualityChart";
import { TopFlavorsChart } from "@/components/stats/TopFlavorsChart";
import { ShotHeatmap } from "@/components/stats/ShotHeatmap";
import { DialInChart } from "@/components/stats/DialInChart";
import { BeanAgeChart } from "@/components/stats/BeanAgeChart";
import { useOverviewStats } from "@/components/stats/hooks";
import { useShots } from "@/components/shots/hooks";
import { useBeans } from "@/components/beans/hooks";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "@/components/ui/date-range-picker";

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
          href={AppRoutes.settings.billing.path}
          className="mt-8 inline-block rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data: session, status } = useSession();
  const canViewStats = hasEntitlement(
    session?.user.entitlements,
    Entitlements.STATS_VIEW,
  );

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [beanId, setBeanId] = useState("");

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data: stats, isLoading: statsLoading } = useOverviewStats();
  const { data: beans } = useBeans();
  const { data: shots, isLoading: shotsLoading } = useShots({
    limit: 500,
    dateFrom,
    dateTo,
    beanId: beanId || undefined,
  });
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  if (status === "loading") return null;

  if (!canViewStats) return <StatsUpgradeSplash />;

  const isLoading = statsLoading || shotsLoading;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            Stats
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Your espresso analytics at a glance
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Bean</label>
          <select
            value={beanId}
            onChange={(e) => setBeanId(e.target.value)}
            className="h-9 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-800 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-500"
          >
            <option value="">All beans</option>
            {(beans ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder="Date range"
          numberOfMonths={2}
        />
        {(dateRange || beanId) && (
          <button
            type="button"
            onClick={() => { setDateRange(undefined); setBeanId(""); }}
            className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Shots"
            value={stats?.totalShots ?? 0}
            icon="☕"
          />
          <StatCard
            label="Avg Quality"
            value={stats?.avgQuality ? `${stats.avgQuality}/5` : null}
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
            <ShotQualityChart shots={shots ?? []} />
            <TopFlavorsChart shots={shots ?? []} />
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
            <DialInChart shots={shots ?? []} />
            <BeanAgeChart shots={shots ?? []} />
          </>
        )}
      </div>

      {/* Flavor Profile */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {shotsLoading ? (
          <div className="h-80 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
        ) : (
          <FlavorProfileChart shots={shots ?? []} />
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

      <FeedbackModal
        open={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
}
