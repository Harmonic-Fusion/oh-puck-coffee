"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { AppRoutes, resolvePath } from "@/app/routes";
import { useCreateShareLink } from "@/components/shots/hooks";
import { buildShotShareText, type ShotShareData } from "@/lib/share-text";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import { getFlavorColor, getBodyColor } from "@/shared/flavor-wheel/colors";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel/flavor-wheel-data";
import { BODY_SELECTOR_DATA } from "@/shared/flavor-wheel/body-data";
import type { FlavorNode } from "@/shared/flavor-wheel/types";

export interface ShotSummary extends ShotShareData {
  shotId: string;
}

interface ShotSuccessModalProps {
  open: boolean;
  onClose: () => void;
  summary: ShotSummary | null;
}

export function ShotSuccessModal({ open, onClose, summary }: ShotSuccessModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const createShareLink = useCreateShareLink();

  // Auto-create share link when modal opens
  useEffect(() => {
    if (open && summary && !createShareLink.data && !createShareLink.isPending) {
      createShareLink.mutate(summary.shotId);
    }
  }, [open, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl = createShareLink.data
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: createShareLink.data.id })}`
    : "";

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;

    const shareData = {
      title: "Journey before Destination!",
      text: summary ? buildShotShareText(summary) : "Check out my espresso shot",
      url: shareUrl,
    };

    // Check if Web Share API is available
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      try {
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        // User cancelled — ignore AbortError, fall through for others
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
        // Fall through to clipboard fallback
      }
    }

    // Fallback: Copy full text + URL to clipboard
    try {
      const fullText = `${shareData.text}\n\n${shareData.url}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (clipboardErr) {
      console.error("Error copying to clipboard:", clipboardErr);
    }
  }, [shareUrl, summary]);

  if (!open || !summary) return null;

  const actualYield = summary.yieldActualGrams ?? summary.yieldGrams;
  const ratio = summary.doseGrams > 0
    ? (actualYield / summary.doseGrams).toFixed(1)
    : null;
  const flavors = summary.flavors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-md overflow-y-auto max-h-[90vh] rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header: Coffee Logo + Title */}
        <div className="mb-5 text-center">
          <img
            src="/logos/logo_complex.png"
            alt="Coffee"
            className="mx-auto mb-2 h-14 w-14"
          />
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">
            Journey before Destination!
          </h2>
        </div>

        {/* Share Preview Card */}
        <div className="mb-5 space-y-4 rounded-xl bg-stone-50 p-4 dark:bg-stone-800">

          {/* Beans Section */}
          {summary.beanName && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Beans
              </h3>
              <p className="text-base font-semibold text-stone-800 dark:text-stone-200">
                {summary.beanName}
              </p>
              <BeanMetaLine
                origin={summary.beanOrigin}
                roaster={summary.beanRoaster}
              />
              <BeanDetailLine
                roastLevel={summary.beanRoastLevel}
                processingMethod={summary.beanProcessingMethod}
                roastDate={summary.beanRoastDate}
              />
            </div>
          )}

          {/* Recipe Section */}
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Recipe
            </h3>
            <div className="flex flex-wrap gap-2">
              <SummaryBadge label="Dose" value={`${summary.doseGrams}g`} />
              <SummaryBadge label="Yield" value={`${actualYield}g`} />
              {ratio && <SummaryBadge label="Ratio" value={`1:${ratio}`} />}
              {summary.grindLevel != null && (
                <SummaryBadge label="Grind" value={`${summary.grindLevel}`} />
              )}
              {summary.brewTempC != null && (
                <SummaryBadge label="Temp" value={`${summary.brewTempC}°C`} />
              )}
              {summary.brewPressure != null && summary.brewPressure !== 9 && (
                <SummaryBadge label="Pressure" value={`${summary.brewPressure} bar`} />
              )}
            </div>
            {(summary.grinderName || summary.machineName) && (
              <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                {[summary.grinderName, summary.machineName].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Results Section */}
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Results
            </h3>
            <div className="flex flex-wrap gap-2">
              <ScoreBadge label="Quality" value={summary.shotQuality} />
              {summary.rating != null && (
                <ScoreBadge label="Rating" value={summary.rating} />
              )}
              {summary.brewTimeSecs != null && (
                <SummaryBadge label="Time" value={`${summary.brewTimeSecs}s`} />
              )}
            </div>

            {/* Tasting Notes (3-6) */}
            {flavors.length > 0 && (
              <div className="mt-2">
                <SelectedBadges
                  title=""
                  items={[
                    ...flavors.map((flavorName) => {
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
                    }),
                    ...(summary.bodyTexture && summary.bodyTexture.length > 0
                      ? [
                          {
                            label: `${summary.bodyTexture[summary.bodyTexture.length - 1]} body`,
                            color: (() => {
                              const bodyValue = summary.bodyTexture[summary.bodyTexture.length - 1];
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
                            key: `body-${summary.bodyTexture[summary.bodyTexture.length - 1]}`,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            )}

            {summary.notes && (
              <p className="mt-2 line-clamp-3 text-sm italic text-stone-600 dark:text-stone-300">
                &ldquo;{summary.notes}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Share link */}
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 truncate bg-transparent text-xs text-stone-500 outline-none dark:text-stone-400"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={async () => {
              if (!shareUrl || !summary) return;
              try {
                const text = buildShotShareText(summary);
                const fullText = `${text}\n\n${shareUrl}`;
                await navigator.clipboard.writeText(fullText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // ignore
              }
            }}
            className="shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => router.push(AppRoutes.dashboard.path)}
          >
            Dashboard
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => {
              onClose();
              router.push(AppRoutes.log.path + "#recipe");
            }}
          >
            Log Another
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleShare}
          >
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BeanMetaLine({ origin, roaster }: { origin?: string | null; roaster?: string | null }) {
  const parts = [origin, roaster].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="text-sm text-stone-600 dark:text-stone-400">
      {parts.join(" · ")}
    </p>
  );
}

function BeanDetailLine({
  roastLevel,
  processingMethod,
  roastDate,
}: {
  roastLevel?: string | null;
  processingMethod?: string | null;
  roastDate?: string | null;
}) {
  const parts: string[] = [];
  if (roastLevel) parts.push(`${roastLevel} roast`);
  if (processingMethod) parts.push(processingMethod);
  if (roastDate) parts.push(`Roasted ${roastDate}`);
  if (parts.length === 0) return null;
  return (
    <p className="text-xs text-stone-500 dark:text-stone-500">
      {parts.join(" · ")}
    </p>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      <span className="text-amber-600/70 dark:text-amber-400/70">{label}</span>
      {value}
    </span>
  );
}

/** Color-coded badge for 1–5 score values (red → yellow → green) */
function ScoreBadge({ label, value }: { label: string; value: number }) {
  const colors = getScoreColors(value);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={colors.label}>{label}</span>
      {value}/5
    </span>
  );
}

function getScoreColors(score: number): { bg: string; text: string; label: string } {
  if (score >= 4.5) {
    return {
      bg: "bg-green-100 dark:bg-green-900/40",
      text: "text-green-800 dark:text-green-300",
      label: "text-green-600/70 dark:text-green-400/70",
    };
  }
  if (score >= 3.5) {
    return {
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
      text: "text-emerald-800 dark:text-emerald-300",
      label: "text-emerald-600/70 dark:text-emerald-400/70",
    };
  }
  if (score >= 2.5) {
    return {
      bg: "bg-yellow-100 dark:bg-yellow-900/40",
      text: "text-yellow-800 dark:text-yellow-300",
      label: "text-yellow-600/70 dark:text-yellow-400/70",
    };
  }
  if (score >= 1.5) {
    return {
      bg: "bg-orange-100 dark:bg-orange-900/40",
      text: "text-orange-800 dark:text-orange-300",
      label: "text-orange-600/70 dark:text-orange-400/70",
    };
  }
  return {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-300",
    label: "text-red-600/70 dark:text-red-400/70",
  };
}

function collectDisplayFlavors(
  categories?: Record<string, string[]> | null,
  adjectives?: string[] | null,
): string[] {
  const flavors: string[] = [];

  if (categories) {
    for (const descriptors of Object.values(categories)) {
      flavors.push(...descriptors);
    }
  }

  if (adjectives) {
    for (const adj of adjectives) {
      if (!flavors.includes(adj)) {
        flavors.push(adj);
      }
    }
  }

  // Return 3-6 tasting notes
  return flavors.slice(0, 6);
}
