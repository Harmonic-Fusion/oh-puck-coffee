"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppRoutes, resolvePath } from "@/app/routes";
import { useCreateShareLink, useToggleReference, useToggleHidden } from "@/components/shots/hooks";
import { type ShotShareData } from "@/lib/share-text";
import { ActionButtonBar, type ActionConfig } from "@/components/shots/ActionButtonBar";
import { BeanIcon } from "@/components/common/BeanIcon";
import { cn } from "@/lib/utils";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import {
  FLAVOR_WHEEL_DATA,
  getFlavorColor,
  getBodyColor,
} from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { formatRating } from "@/lib/format-rating";
import { formatTemp, roundToOneDecimal } from "@/lib/format-numbers";
import { useTempUnit } from "@/lib/use-temp-unit";

/** Match `useShotActions` / shot detail toolbar (inline to avoid Turbopack icon ref issues). */
function PencilSquareIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function BookmarkIconOutline({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}

function BookmarkIconSolid({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function EyeIconSolid({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export interface ShotSummary extends ShotShareData {
  shotId: string;
  beanId: string;
  isReferenceShot: boolean;
  isHidden: boolean;
}

interface ShotSuccessModalProps {
  open: boolean;
  onClose: () => void;
  summary: ShotSummary | null;
  phrase?: string;
}

interface ShotSuccessCardActionsProps {
  shotId: string;
  isReferenceShot: boolean;
  isHidden: boolean;
  onClose: () => void;
}

function ShotSuccessCardActions({
  shotId,
  isReferenceShot,
  isHidden,
  onClose,
}: ShotSuccessCardActionsProps) {
  const router = useRouter();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();
  const [localReference, setLocalReference] = useState(isReferenceShot);
  const [localHidden, setLocalHidden] = useState(isHidden);

  return (
    <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-600">
      <div className="flex items-stretch justify-between gap-2">
        <button
          type="button"
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg p-2 transition-colors",
            "text-stone-500 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:bg-stone-700/80",
          )}
          title="Edit shot"
          aria-label="Edit shot"
          onClick={() => {
            onClose();
            router.push(`${resolvePath(AppRoutes.shot.id, { id: shotId })}?edit=1`);
          }}
        >
          <PencilSquareIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={toggleReference.isPending}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg p-2 transition-colors",
            localReference
              ? "text-amber-600 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:bg-amber-900/30"
              : "text-stone-500 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:bg-stone-700/80",
          )}
          title={localReference ? "Remove reference shot" : "Mark as reference shot"}
          aria-label={localReference ? "Remove reference shot" : "Mark as reference shot"}
          onClick={() => {
            toggleReference.mutate(shotId, {
              onSuccess: (updated) => {
                setLocalReference(Boolean(updated.isReferenceShot));
              },
            });
          }}
        >
          {localReference ? (
            <BookmarkIconSolid className="h-6 w-6" />
          ) : (
            <BookmarkIconOutline className="h-6 w-6" />
          )}
        </button>
        <button
          type="button"
          disabled={toggleHidden.isPending}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg p-2 transition-colors",
            localHidden
              ? "text-amber-600 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:bg-amber-900/30"
              : "text-stone-500 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:bg-stone-700/80",
          )}
          title={localHidden ? "Show shot" : "Hide shot"}
          aria-label={localHidden ? "Show shot" : "Hide shot"}
          onClick={() => {
            toggleHidden.mutate(shotId, {
              onSuccess: (updated) => {
                setLocalHidden(Boolean(updated.isHidden));
              },
            });
          }}
        >
          {localHidden ? (
            <EyeSlashIcon className="h-6 w-6" />
          ) : (
            <EyeIconSolid className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ShotSuccessModal({ open, onClose, summary, phrase }: ShotSuccessModalProps) {
  const router = useRouter();
  const [tempUnit] = useTempUnit();
  const createShareLink = useCreateShareLink();

  const shotIdRef = useRef(summary?.shotId);
  useEffect(() => { shotIdRef.current = summary?.shotId; }, [summary?.shotId]);

  const getShareUrl = useCallback(async (): Promise<string> => {
    const currentShotId = shotIdRef.current;
    if (!currentShotId) {
      throw new Error("Shot ID is required");
    }
    
    // Always create a fresh share link for this shot
    const shareData = await new Promise<{ id: string }>((resolve, reject) => {
      createShareLink.mutate(currentShotId, {
        onSuccess: (data) => resolve(data),
        onError: reject,
      });
    });
    
    if (!shareData || !shareData.id) {
      throw new Error("Failed to create share link");
    }
    return `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: shareData.id })}`;
  }, [createShareLink]);

  const handleShare = useCallback(async (text: string, shareUrl: string) => {
    const shareData = {
      title: "Journey before Destination!",
      text,
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

    // Fallback: Copy text to clipboard (URL is already in the text)
    try {
      await navigator.clipboard.writeText(shareData.text);
    } catch (clipboardErr) {
      console.error("Error copying to clipboard:", clipboardErr);
    }
  }, []);

  if (!open || !summary) return null;

  const actualYield = summary.yieldActualGrams ?? summary.yieldGrams;
  const ratio = summary.doseGrams > 0
    ? roundToOneDecimal(actualYield / summary.doseGrams)
    : null;
  const flavors = summary.flavors || [];
  const actionConfigs: ActionConfig[] = [
    {
      key: "beans",
      icon: BeanIcon,
      onClick: () => {
        onClose();
        router.push(resolvePath(AppRoutes.beans.beanId, { id: summary.beanId }));
      },
      title: "Beans",
      variant: "default",
    },
    {
      key: "logAnother",
      icon: PlusCircleIcon,
      onClick: () => {
        onClose();
        // `previousShotId` forces a URL change on /log so pre-population re-runs with the
        // shot we just logged (setup + recipe); brewing/tasting stay cleared in the hook.
        const params = new URLSearchParams({ previousShotId: summary.shotId });
        router.push(`${AppRoutes.log.path}?${params.toString()}#recipe`);
      },
      title: "Log another",
      variant: "active",
    },
    {
      key: "share",
      shotData: summary,
      tempUnit,
      getShareUrl,
      onShare: handleShare,
      title: "Share",
      buttonVariant: "primary",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-md overflow-y-auto max-h-[90vh] rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Coffee Logo + Title */}
        <div className="mb-5 text-center">
          <Image
            src="/logos/logo_complex.png"
            alt="Coffee"
            width={56}
            height={56}
            className="mx-auto mb-2"
          />
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">
            Journey before Destination!
          </h2>
          {phrase && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {phrase}
            </p>
          )}
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
              <SummaryBadge label="Dose" value={`${roundToOneDecimal(summary.doseGrams)}g`} />
              <SummaryBadge label="Yield" value={`${roundToOneDecimal(actualYield)}g`} />
              {ratio && <SummaryBadge label="Ratio" value={`1:${ratio}`} />}
              {summary.grindLevel != null && (
                <SummaryBadge label="Grind" value={`${summary.grindLevel}`} />
              )}
              {summary.brewTempC != null && (
                <SummaryBadge label="Temp" value={formatTemp(summary.brewTempC, tempUnit) ?? ""} />
              )}
              {summary.brewPressure != null && summary.brewPressure !== 9 && (
                <SummaryBadge label="Pressure" value={`${roundToOneDecimal(summary.brewPressure)} bar`} />
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
              {summary.shotQuality != null && (
                <ScoreBadge label="Quality" value={summary.shotQuality} />
              )}
              {summary.rating != null && (
                <ScoreBadge label="Rating" value={summary.rating} />
              )}
              {summary.brewTimeSecs != null && (
                <SummaryBadge label="Time" value={`${roundToOneDecimal(summary.brewTimeSecs)}s`} />
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
                            color: getBodyColor(summary.bodyTexture[summary.bodyTexture.length - 1]),
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

          <ShotSuccessCardActions
            key={summary.shotId}
            shotId={summary.shotId}
            isReferenceShot={summary.isReferenceShot}
            isHidden={summary.isHidden}
            onClose={onClose}
          />
        </div>

        {/* Action buttons */}
        <ActionButtonBar actions={actionConfigs} className="gap-3" showLabels stackLabels />
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
  const displayValue = label === "Rating" ? formatRating(value) : `${value}/5`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={colors.label}>{label}</span>
      {displayValue}
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
