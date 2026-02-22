"use client";

import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import Link from "next/link";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import { getFlavorColor, getBodyColor, getAdjectiveColor } from "@/shared/flavor-wheel/colors";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel/flavor-wheel-data";
import { BODY_SELECTOR_DATA } from "@/shared/flavor-wheel/body-data";
import { ADJECTIVES_INTENSIFIERS_DATA } from "@/shared/flavor-wheel/adjectives-data";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { formatRating } from "@/lib/format-rating";
import { formatTemp, roundToOneDecimal } from "@/lib/format-numbers";
import { useTempUnit } from "@/lib/use-temp-unit";

interface SharedShot {
  id: string;
  userName: string | null;
  userImage: string | null;
  beanName: string | null;
  beanRoastLevel: string | null;
  beanRoastDate: Date | string | null;
  grinderName: string | null;
  machineName: string | null;
  doseGrams: string;
  yieldGrams: string;
  grindLevel: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  estimateMaxPressure: string | null;
  flowControl: string | null;
  flowRate: string | null;
  shotQuality: string | null;
  rating: string | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  isReferenceShot: boolean;
  createdAt: Date | string;
  brewRatio: number | null;
  daysPostRoast: number | null;
}

interface SharedShotViewProps {
  shot: SharedShot;
}

function DetailRow({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number | null | undefined;
  subtitle?: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex justify-between py-2.5 text-sm">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <div className="text-right">
        <span className="font-medium text-stone-800 dark:text-stone-200">
          {value}
        </span>
        {subtitle && (
          <p className="text-xs text-stone-400 dark:text-stone-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function SharedShotView({ shot }: SharedShotViewProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [tempUnit] = useTempUnit();

  const ratio =
    shot.brewRatio != null ? roundToOneDecimal(shot.brewRatio) : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-50 px-4 py-8 dark:bg-stone-950">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <span className="text-4xl">☕</span>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-200">
          Coffee Tracker
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        {/* Who & When */}
        <div className="mb-5 flex items-center gap-3">
          {shot.userImage ? (
            <img
              src={shot.userImage}
              alt={shot.userName ?? "User"}
              className="h-10 w-10 rounded-full border border-stone-200 dark:border-stone-700"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {(shot.userName ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-stone-800 dark:text-stone-200">
              {shot.userName ?? "Someone"}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {new Date(shot.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {shot.isReferenceShot && (
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              ⭐ Reference
            </span>
          )}
        </div>

        {/* Bean */}
        <div className="mb-5 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
          <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            {shot.beanName ?? "Unknown bean"}
          </p>
          {shot.beanRoastLevel && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {shot.beanRoastLevel} roast
            </p>
          )}
        </div>

        {/* Quality */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Shot Quality
          </span>
          <span className="ml-auto text-2xl font-bold text-amber-600 dark:text-amber-400">
            {shot.shotQuality}
          </span>
          <span className="text-sm text-stone-400 dark:text-stone-500">
            / 5
          </span>
        </div>

        {/* Rating */}
        {shot.rating != null && (
          <div className="mb-4 flex flex-col gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">
              Rating
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {shot.rating}
              </span>
              <span className="text-lg">{formatRating(shot.rating ? parseFloat(shot.rating) : null)}</span>
            </div>
          </div>
        )}

        {/* Recipe */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Recipe
          </h3>
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
            <DetailRow label="Dose" value={`${roundToOneDecimal(shot.doseGrams)}g`} />
            <DetailRow
              label="Target Yield"
              value={`${roundToOneDecimal(shot.yieldGrams)}g`}
              subtitle={ratio ? `1:${ratio}` : "-/-"}
            />
            <DetailRow label="Grind Level" value={shot.grindLevel} />
            <DetailRow
              label="Brew Temp"
              value={formatTemp(shot.brewTempC, tempUnit)}
            />
            <DetailRow
              label="Pre-infusion"
              value={
                shot.preInfusionDuration
                  ? `${roundToOneDecimal(shot.preInfusionDuration)}s`
                  : null
              }
            />
            <DetailRow
              label="Brew Pressure"
              value={shot.brewPressure ? `${roundToOneDecimal(shot.brewPressure)} bar` : null}
            />
            <DetailRow label="Grinder" value={shot.grinderName} />
            <DetailRow label="Machine" value={shot.machineName} />
            <DetailRow label="Days Post Roast" value={shot.daysPostRoast} />
          </div>
        </div>

        {/* Results */}
        {(shot.brewTimeSecs || shot.estimateMaxPressure) && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Results
            </h3>
            <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
              {shot.brewTimeSecs && (
                <DetailRow
                  label="Brew Time"
                  value={`${roundToOneDecimal(shot.brewTimeSecs)}s`}
                  subtitle={shot.flowRate ? `${roundToOneDecimal(shot.flowRate)} g/s` : "-:-"}
                />
              )}
              {shot.estimateMaxPressure && (
                <DetailRow
                  label="Est. Max Pressure"
                  value={`${roundToOneDecimal(shot.estimateMaxPressure)} bar`}
                />
              )}
            </div>
          </div>
        )}

        {/* Tasting */}
        {(shot.notes ||
          (shot.bodyTexture && shot.bodyTexture.length > 0) ||
          (shot.flavors && shot.flavors.length > 0) ||
          (shot.adjectives && shot.adjectives.length > 0)) && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Tasting
            </h3>
            <div className="space-y-3">
              {shot.bodyTexture && shot.bodyTexture.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                    Body
                  </p>
                  <SelectedBadges
                    title=""
                    items={[
                      {
                        label: shot.bodyTexture[shot.bodyTexture.length - 1],
                        color: (() => {
                          const bodyValue = shot.bodyTexture[shot.bodyTexture.length - 1];
                          // Find which category this body descriptor belongs to
                          for (const [category, descriptors] of Object.entries(BODY_SELECTOR_DATA)) {
                            if (descriptors.some((d: string) => d.toLowerCase() === bodyValue.toLowerCase())) {
                              return getBodyColor(category as "light" | "medium" | "heavy");
                            }
                          }
                          // If it's just the category name
                          if (["light", "medium", "heavy"].includes(bodyValue.toLowerCase())) {
                            return getBodyColor(bodyValue.toLowerCase() as "light" | "medium" | "heavy");
                          }
                          return getBodyColor("light"); // Default
                        })(),
                        key: shot.bodyTexture[shot.bodyTexture.length - 1],
                        className: "capitalize",
                      },
                    ]}
                  />
                </div>
              )}

              {shot.notes && (
                <div>
                  <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
                    {shot.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flavors */}
        {shot.flavors && shot.flavors.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Flavors
            </h3>
            <SelectedBadges
              title=""
              items={shot.flavors.map((flavorName) => {
                // Find the path for this flavor name in the tree
                const findFlavorPath = (node: FlavorNode, path: string[] = []): string[] | null => {
                  const currentPath = [...path, node.name];
                  if (node.name === flavorName) {
                    return currentPath;
                  }
                  if (node.children) {
                    for (const child of node.children) {
                      const result = findFlavorPath(child, currentPath);
                      if (result) return result;
                    }
                  }
                  return null;
                };

                let flavorPath: string[] = [];
                for (const category of FLAVOR_WHEEL_DATA.children) {
                  const path = findFlavorPath(category);
                  if (path) {
                    flavorPath = path;
                    break;
                  }
                }

                return {
                  label: flavorName,
                  color: getFlavorColor(flavorPath),
                  key: flavorName,
                };
              })}
            />
          </div>
        )}

        {shot.adjectives && shot.adjectives.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
              Adjectives
            </p>
            <SelectedBadges
              title=""
              items={shot.adjectives.map((adjective) => {
                // Find which row and side this adjective belongs to
                let color = "rgba(158, 158, 158, 0.3)"; // Default color
                for (let rowIndex = 0; rowIndex < ADJECTIVES_INTENSIFIERS_DATA.rows.length; rowIndex++) {
                  const row = ADJECTIVES_INTENSIFIERS_DATA.rows[rowIndex];
                  if (row.left.some((adj: string) => adj.toLowerCase() === adjective.toLowerCase())) {
                    color = getAdjectiveColor(rowIndex, "left");
                    break;
                  }
                  if (row.right.some((adj: string) => adj.toLowerCase() === adjective.toLowerCase())) {
                    color = getAdjectiveColor(rowIndex, "right");
                    break;
                  }
                }

                return {
                  label: adjective,
                  color,
                  key: adjective,
                };
              })}
            />
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {isLoggedIn ? (
          <Link
            href={AppRoutes.home.path}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Track your own espresso shots and dial in perfection
            </p>
            <Link
              href={AppRoutes.login.path}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Log Your Own Shots
            </Link>
          </>
        )}
        <p className="text-xs text-stone-400 dark:text-stone-600">
          Powered by Coffee Tracker
        </p>
      </div>
    </div>
  );
}
