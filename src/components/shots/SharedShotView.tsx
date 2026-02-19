"use client";

import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import Link from "next/link";

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
  shotQuality: string;
  rating: string | null;
  notes: string | null;
  flavorWheelCategories: Record<string, string[]> | null;
  flavorWheelBody: string | null;
  flavorWheelAdjectives: string[] | null;
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
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null) return null;
  return (
    <div className="flex justify-between py-2.5 text-sm">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="font-medium text-stone-800 dark:text-stone-200">
        {value}
      </span>
    </div>
  );
}

export function SharedShotView({ shot }: SharedShotViewProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const ratio =
    shot.brewRatio != null ? shot.brewRatio.toFixed(1) : null;

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
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">
              Rating
            </span>
            <span className="ml-auto text-2xl font-bold text-blue-600 dark:text-blue-400">
              {shot.rating}
            </span>
            <span className="text-sm text-stone-400 dark:text-stone-500">
              / 5
            </span>
          </div>
        )}

        {/* Recipe */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Recipe
          </h3>
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
            <DetailRow label="Dose" value={`${shot.doseGrams}g`} />
            <DetailRow
              label="Target Yield"
              value={`${shot.yieldGrams}g${ratio ? ` (1:${ratio})` : ""}`}
            />
            <DetailRow label="Grind Level" value={shot.grindLevel} />
            <DetailRow
              label="Brew Temp"
              value={shot.brewTempC ? `${shot.brewTempC}°C` : null}
            />
            <DetailRow
              label="Pre-infusion"
              value={
                shot.preInfusionDuration
                  ? `${shot.preInfusionDuration}s`
                  : null
              }
            />
            <DetailRow
              label="Brew Pressure"
              value={shot.brewPressure ? `${shot.brewPressure} bar` : null}
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
                  value={`${shot.brewTimeSecs}s${shot.flowRate ? ` · ${shot.flowRate} g/s` : ""}`}
                />
              )}
              {shot.estimateMaxPressure && (
                <DetailRow
                  label="Est. Max Pressure"
                  value={`${shot.estimateMaxPressure} bar`}
                />
              )}
            </div>
          </div>
        )}

        {/* Tasting */}
        {(shot.notes ||
          shot.flavorWheelBody ||
          (shot.flavorWheelCategories &&
            Object.keys(shot.flavorWheelCategories).length > 0) ||
          (shot.flavorWheelAdjectives &&
            shot.flavorWheelAdjectives.length > 0)) && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Tasting
            </h3>
            <div className="space-y-3">
              {shot.flavorWheelBody && (
                <div>
                  <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                    Body
                  </p>
                  <span className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs text-stone-700 dark:border-stone-700 dark:text-stone-300">
                    {shot.flavorWheelBody}
                  </span>
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

        {/* Flavor Wheel */}
        {shot.flavorWheelCategories &&
          Object.keys(shot.flavorWheelCategories).length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Flavor Wheel
              </h3>
              <div className="space-y-2">
                {Object.entries(shot.flavorWheelCategories).map(
                  ([key, flavors]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        {key}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(flavors as string[]).map((f) => (
                          <span
                            key={f}
                            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {shot.flavorWheelAdjectives &&
          shot.flavorWheelAdjectives.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                Adjectives
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shot.flavorWheelAdjectives.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                  >
                    {a}
                  </span>
                ))}
              </div>
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
