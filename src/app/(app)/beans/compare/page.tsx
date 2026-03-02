"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useBeansCompare, type BeanWithComparisons } from "@/components/beans/hooks";
import { CompareItems, type CompareFieldConfig } from "@/components/common/CompareItems";
import { AppRoutes } from "@/app/routes";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

// ── Field config ──────────────────────────────────────────────────────

const BEAN_FIELDS: CompareFieldConfig[] = [
  { field: "roastLevel", label: "Roast Level", type: "text" },
  { field: "origin", label: "Origin", type: "text" },
  { field: "originDetails", label: "Origin Details", type: "text" },
  { field: "roaster", label: "Roaster", type: "text" },
  { field: "processingMethod", label: "Processing", type: "text" },
  { field: "roastDate", label: "Roast Date", type: "date" },
  { field: "openBagDate", label: "Open Bag Date", type: "date" },
];

const STATS_FIELDS: CompareFieldConfig[] = [
  { field: "shotCount", label: "Total Shots", type: "number" },
  { field: "bestRating", label: "Best Rating", type: "rating", higherIsBetter: true },
  { field: "avgRating", label: "Avg Rating", type: "rating", higherIsBetter: true },
  { field: "avgQuality", label: "Avg Quality", type: "number", higherIsBetter: true },
  { field: "firstShotDate", label: "First Shot", type: "date" },
  { field: "lastShotDate", label: "Last Shot", type: "date" },
  { field: "topFlavors", label: "Top Flavors", type: "tags" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

// ── Flatten bean data for CompareItems ───────────────────────────────

function flattenBean(b: BeanWithComparisons): Record<string, unknown> {
  return {
    // Bean fields
    name: b.name,
    roastLevel: b.roastLevel,
    origin: b.origin,
    originDetails: b.originDetails,
    roaster: b.roaster,
    processingMethod: b.processingMethod,
    roastDate: b.roastDate,
    openBagDate: b.openBagDate,
    // Stats fields (flattened from shotComparisons)
    shotCount: b.shotComparisons.shotCount,
    bestRating: b.shotComparisons.bestRating,
    avgRating: b.shotComparisons.avgRating,
    avgQuality: b.shotComparisons.avgQuality,
    firstShotDate: b.shotComparisons.firstShotDate,
    lastShotDate: b.shotComparisons.lastShotDate,
    topFlavors: b.shotComparisons.flavorStats.map(
      (f) => `${f.flavor} (★${f.avgRating})`,
    ),
  };
}

// ── Shot history section ─────────────────────────────────────────────

function ShotHistoryTable({ beans }: { beans: BeanWithComparisons[] }) {
  // Find the maximum number of shots across all beans
  const maxShots = Math.max(...beans.map((b) => b.shotComparisons.shots.length), 0);

  if (maxShots === 0) {
    return (
      <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
        No shots recorded for these beans yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Shot #
            </th>
            {beans.map((b, i) => (
              <th key={i} className="min-w-[200px] px-4 py-3 text-center text-sm font-semibold text-stone-700 dark:text-stone-300">
                {b.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {Array.from({ length: maxShots }).map((_, shotIdx) => (
            <tr key={shotIdx} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
              <td className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                Shot #{shotIdx + 1}
              </td>
              {beans.map((b, beanIdx) => {
                const shot = b.shotComparisons.shots[shotIdx];
                if (!shot) {
                  return (
                    <td key={beanIdx} className="px-4 py-2.5 text-center text-xs text-stone-300 dark:text-stone-700">
                      —
                    </td>
                  );
                }
                const dose = shot.doseGrams ? parseFloat(shot.doseGrams).toFixed(1) : null;
                const yieldG = shot.yieldGrams ? parseFloat(shot.yieldGrams).toFixed(1) : null;
                const ratio = shot.brewRatio ? shot.brewRatio.toFixed(2) : null;
                const rating = shot.rating ? parseFloat(shot.rating).toFixed(1) : null;
                return (
                  <td key={beanIdx} className="px-4 py-2.5 text-center">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {fmtDate(shot.createdAt)}
                      {shot.daysPostRoast != null && (
                        <span className="ml-1 text-stone-400">+{shot.daysPostRoast}d</span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-stone-700 dark:text-stone-300">
                      {dose && yieldG ? `${dose}→${yieldG}g` : "—"}
                      {ratio && <span className="ml-1 text-stone-400">({ratio})</span>}
                    </p>
                    {rating && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">★ {rating}</p>
                    )}
                    {shot.flavors && shot.flavors.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1 items-center">
                        {shot.flavors.map((flavor, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {flavor}
                          </span>
                        ))}
                      </div>
                    )}
                    {shot.bodyTexture && shot.bodyTexture.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1 items-center">
                        {shot.bodyTexture.map((bt, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                          >
                            {bt}
                          </span>
                        ))}
                      </div>
                    )}
                    {shot.adjectives && shot.adjectives.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1 items-center">
                        {shot.adjectives.map((adj, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {adj}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function BeanComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const idsParam = searchParams.get("ids") ?? "";
  const beanIds = useMemo(
    () => idsParam.split(",").filter(Boolean),
    [idsParam],
  );

  const { data, isLoading, error } = useBeansCompare(beanIds);
  const compareBeans = data?.beans ?? [];

  const flattenedBeans = useMemo(
    () => compareBeans.map(flattenBean),
    [compareBeans],
  );

  const handleDeselect = (index: number) => {
    const newIds = beanIds.filter((_, i) => i !== index);
    if (newIds.length === 0) {
      router.push(AppRoutes.beans.path);
    } else {
      router.push(`${AppRoutes.beans.compare.path}?ids=${newIds.join(",")}`);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-48 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (error || beanIds.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-stone-500">
          {beanIds.length === 0 ? "No beans selected for comparison." : "Failed to load comparison data."}
        </p>
        <Link
          href={AppRoutes.beans.path}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Beans
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 pt-4 text-sm text-stone-500 dark:text-stone-400 sm:pt-0">
        <Link
          href={AppRoutes.beans.path}
          className="hover:text-stone-700 dark:hover:text-stone-300"
        >
          Beans
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="text-stone-800 dark:text-stone-200">Compare</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Bean Comparison
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Comparing {compareBeans.length} bean{compareBeans.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Bean details comparison */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-stone-700 dark:text-stone-300">
          Bean Details
        </h2>
        <CompareItems
          config={BEAN_FIELDS}
          items={flattenedBeans}
          maxItems={5}
          onDeselect={handleDeselect}
          renderItemHeader={(_, i) => {
            const bean = compareBeans[i];
            return bean ? (
              <div className="space-y-0.5">
                <Link
                  href={`${AppRoutes.beans.path}/${bean.id}`}
                  className="block truncate text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
                >
                  {bean.name}
                </Link>
                {bean.roaster && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">{bean.roaster}</p>
                )}
              </div>
            ) : null;
          }}
        />
      </section>

      {/* Shot stats comparison */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-stone-700 dark:text-stone-300">
          Shot Statistics
        </h2>
        <CompareItems
          config={STATS_FIELDS}
          items={flattenedBeans}
          maxItems={5}
          onDeselect={handleDeselect}
          renderItemHeader={(_, i) => {
            const bean = compareBeans[i];
            return bean ? (
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                {bean.name}
              </span>
            ) : null;
          }}
        />
      </section>

      {/* Shot history by index */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-stone-700 dark:text-stone-300">
          Shot History
        </h2>
        <p className="mb-3 text-xs text-stone-400 dark:text-stone-500">
          Shots indexed by order logged (oldest = #1). Days post-roast shown in parentheses.
        </p>
        <ShotHistoryTable beans={compareBeans} />
      </section>
    </div>
  );
}
