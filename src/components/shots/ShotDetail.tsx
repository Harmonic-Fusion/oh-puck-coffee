"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { useTools } from "@/components/equipment/hooks";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { AppRoutes, resolvePath } from "@/app/routes";
import { ShotEditForm } from "@/components/shots/form/ShotEditForm";
import {
  useShot,
  useCreateShareLink,
  useShotMetrics,
} from "@/components/shots/hooks";
import { type ShotShareData } from "@/lib/share-text";
import { ActionButtonBar } from "./ActionButtonBar";
import { useShotActions } from "./useShotActions";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import {
  FLAVOR_WHEEL_DATA,
  getFlavorColor,
  getBodyColor,
  getAdjectiveColor,
  getBitterColor,
  getSourColor,
} from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { formatRating } from "@/lib/format-rating";
import { formatTemp, roundToOneDecimal } from "@/lib/format-numbers";
import { useTempUnit } from "@/lib/use-temp-unit";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkIconSolid,
  EyeIcon as EyeIconSolid,
} from "@heroicons/react/24/solid";

const SHOT_DETAIL_EXPANDED_SECTIONS_KEY =
  "coffee-shot-detail-expanded-sections";
const DEFAULT_EXPANDED_SECTIONS = [
  "setup",
  "recipe",
  "results",
  "metrics",
  "tasting",
];

function getSavedExpandedSections(): Set<string> {
  if (typeof window === "undefined") {
    return new Set(DEFAULT_EXPANDED_SECTIONS);
  }
  const saved = localStorage.getItem(SHOT_DETAIL_EXPANDED_SECTIONS_KEY);
  if (!saved) {
    return new Set(DEFAULT_EXPANDED_SECTIONS);
  }
  try {
    const parsed = JSON.parse(saved) as string[];
    // Validate that all sections are valid
    const validSections = ["setup", "recipe", "results", "metrics", "tasting"];
    const filtered = parsed.filter((s) => validSections.includes(s));
    return filtered.length > 0
      ? new Set(filtered)
      : new Set(DEFAULT_EXPANDED_SECTIONS);
  } catch (error: unknown) {
    // Invalid JSON or other error - return defaults
    return new Set(DEFAULT_EXPANDED_SECTIONS);
  }
}

function saveExpandedSections(sections: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SHOT_DETAIL_EXPANDED_SECTIONS_KEY,
    JSON.stringify(Array.from(sections)),
  );
}

interface ShotDetailProps {
  shot: ShotWithJoins | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onToggleReference?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  readOnly?: boolean;
  shots?: ShotWithJoins[];
  currentIndex?: number;
  onShotChange?: (shot: ShotWithJoins) => void;
  initialEditMode?: boolean;
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
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <div className="text-right">
        <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
          {value}
        </span>
        {subtitle && (
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export function ShotDetail({
  shot,
  open,
  onClose,
  onDelete,
  onToggleReference,
  onToggleHidden,
  readOnly = false,
  shots,
  currentIndex,
  onShotChange,
  initialEditMode = false,
}: ShotDetailProps) {
  const router = useRouter();
  const [tempUnit] = useTempUnit();
  const { data: allTools } = useTools();
  const toolMap = useMemo(() => {
    const m = new Map<string, string>();
    allTools?.forEach((t) => m.set(t.slug, t.name));
    return m;
  }, [allTools]);

  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [shareCopied, setShareCopied] = useState(false);
  const createShareLink = useCreateShareLink();

  // Reset edit mode when modal closes or shot changes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
    } else {
      setIsEditMode(initialEditMode);
    }
  }, [open, initialEditMode]);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Collapsible section state - lazy init from localStorage (runs once on mount)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    getSavedExpandedSections,
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
    saveExpandedSections(newExpanded);
  };

  // Fetch fresh shot data when in edit mode
  const { data: freshShot, refetch } = useShot(
    isEditMode && shot ? shot.id : null,
  );
  const currentShot = isEditMode && freshShot ? freshShot : shot;

  // Fetch metrics for the current shot
  const { data: metrics } = useShotMetrics(shot?.id ?? null);

  // Compute duplicate URL during render (avoid useEffect for derived values)
  const duplicateUrl = useMemo(() => {
    if (!shot || typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (shot.beanId) params.set("beanId", shot.beanId);
    if (shot.grinderId) params.set("grinderId", shot.grinderId);
    if (shot.machineId) params.set("machineId", shot.machineId);
    if (shot.doseGrams) params.set("doseGrams", shot.doseGrams);
    if (shot.yieldGrams) params.set("yieldGrams", shot.yieldGrams);
    if (shot.grindLevel) params.set("grindLevel", shot.grindLevel);
    if (shot.brewTempC) params.set("brewTempC", shot.brewTempC);
    if (shot.preInfusionDuration)
      params.set("preInfusionDuration", shot.preInfusionDuration);
    if (shot.brewPressure) params.set("brewPressure", shot.brewPressure);
    if (shot.toolsUsed && shot.toolsUsed.length > 0) {
      params.set("toolsUsed", shot.toolsUsed.join(","));
    }
    return `${window.location.origin}${AppRoutes.log.path}?${params.toString()}`;
  }, [shot]);

  const shotShareData = useMemo<ShotShareData | null>(() => {
    if (!shot) return null;
    return {
      beanName: shot.beanName,
      beanRoastLevel: shot.beanRoastLevel,
      beanOrigin: null,
      beanRoaster: null,
      beanRoastDate: shot.beanRoastDate
        ? new Date(shot.beanRoastDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
      beanProcessingMethod: null,
      shotQuality: shot.shotQuality,
      rating: shot.rating,
      bitter: shot.bitter,
      sour: shot.sour,
      doseGrams: parseFloat(shot.doseGrams),
      yieldGrams: parseFloat(shot.yieldGrams),
      yieldActualGrams: shot.yieldActualGrams
        ? parseFloat(shot.yieldActualGrams)
        : null,
      brewTimeSecs: shot.brewTimeSecs ? parseFloat(shot.brewTimeSecs) : null,
      grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : null,
      brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : null,
      brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : null,
      grinderName: shot.grinderName,
      machineName: shot.machineName,
      flavors: shot.flavors,
      bodyTexture: shot.bodyTexture,
      adjectives: shot.adjectives,
      notes: shot.notes,
    };
  }, [shot]);

  const shotIdRef = useRef(shot?.id);
  shotIdRef.current = shot?.id;

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
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare
    ) {
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
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (clipboardErr) {
      console.error("Error copying to clipboard:", clipboardErr);
    }
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (
      !shots ||
      currentIndex === undefined ||
      currentIndex <= 0 ||
      !onShotChange
    )
      return;
    const prevShot = shots[currentIndex - 1];
    if (prevShot) {
      onShotChange(prevShot);
    }
  }, [shots, currentIndex, onShotChange]);

  const handleNext = useCallback(() => {
    if (
      !shots ||
      currentIndex === undefined ||
      currentIndex >= shots.length - 1 ||
      !onShotChange
    )
      return;
    const nextShot = shots[currentIndex + 1];
    if (nextShot) {
      onShotChange(nextShot);
    }
  }, [shots, currentIndex, onShotChange]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      if (touchStartX.current === null || touchEndX.current === null) return;

      const deltaX = touchStartX.current - touchEndX.current;
      if (Math.abs(deltaX) >= 50) {
        if (deltaX > 0) {
          // Swipe left - next shot
          handleNext();
        } else {
          // Swipe right - previous shot
          handlePrevious();
        }
      }

      touchStartX.current = null;
      touchEndX.current = null;
    },
    [handleNext, handlePrevious],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open || !shots || currentIndex === undefined) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, shots, currentIndex, handlePrevious, handleNext]);

  if (!shot) return null;

  const handleEditSuccess = () => {
    setIsEditMode(false);
    refetch();
    if (onToggleReference) {
      setTimeout(() => {
        refetch();
      }, 100);
    }
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
  };

  const handleDuplicate = () => {
    if (duplicateUrl) {
      onClose();
      router.push(duplicateUrl);
    } else {
      const duplicateData = {
        shotId: shot.id,
        beanId: shot.beanId,
        grinderId: shot.grinderId,
        machineId: shot.machineId || undefined,
        doseGrams: shot.doseGrams ? parseFloat(shot.doseGrams) : undefined,
        yieldGrams: shot.yieldGrams ? parseFloat(shot.yieldGrams) : undefined,
        grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : undefined,
        brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : undefined,
        preInfusionDuration: shot.preInfusionDuration
          ? parseFloat(shot.preInfusionDuration)
          : undefined,
        brewPressure: shot.brewPressure
          ? parseFloat(shot.brewPressure)
          : undefined,
        toolsUsed: shot.toolsUsed || [],
      };
      sessionStorage.setItem("duplicateShot", JSON.stringify(duplicateData));
      onClose();
      router.push(AppRoutes.log.path);
    }
  };

  const handleToggleReference = () => {
    if (onToggleReference) {
      onToggleReference(shot.id);
    }
  };

  const handleToggleHidden = () => {
    if (onToggleHidden) {
      onToggleHidden(shot.id);
    }
  };

  const dose = parseFloat(shot.doseGrams);
  const yieldG = parseFloat(shot.yieldGrams);
  const yieldActual = shot.yieldActualGrams
    ? parseFloat(shot.yieldActualGrams)
    : null;
  const ratio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;
  const actualRatio =
    dose > 0 && yieldActual
      ? parseFloat((yieldActual / dose).toFixed(2))
      : null;

  const shotActions = useShotActions({
    shot,
    tempUnit,
    shotShareData,
    getShareUrl,
    onShare: handleShare,
    onEdit: !isEditMode ? () => setIsEditMode(true) : undefined,
    onToggleReference: onToggleReference ? handleToggleReference : undefined,
    onToggleHidden: onToggleHidden ? handleToggleHidden : undefined,
    onDuplicate: handleDuplicate,
    showEdit: !isEditMode,
  });

  const footer = readOnly ? null : (
    <ActionButtonBar actions={shotActions} />
  );

  // Custom header with navigation buttons
  const canNavigate = !!(shots && currentIndex !== undefined && onShotChange);
  const canGoPrevious = canNavigate && currentIndex! > 0;
  const canGoNext = canNavigate && currentIndex! < shots!.length - 1;

  const handleClose = () => {
    if (isEditMode) {
      setIsEditMode(false);
    }
    onClose();
  };

  const modalHeader = canNavigate ? (
    <div className="flex items-center justify-between w-full">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
        {isEditMode ? "Edit Shot" : "Shot Detail"}
      </h2>
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {currentIndex! + 1} / {shots!.length}
        </span>
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  ) : undefined;

  // Side arrow handles (only when navigating and not in edit mode)
  const leftArrowSlot =
    canNavigate && !isEditMode ? (
      <button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
        title="Previous shot (←)"
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
    ) : undefined;

  const rightArrowSlot =
    canNavigate && !isEditMode ? (
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
        title="Next shot (→)"
      >
        <ChevronRightIcon className="h-6 w-6" />
      </button>
    ) : undefined;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={canNavigate ? undefined : isEditMode ? "Edit Shot" : "Shot Detail"}
      header={modalHeader}
      footer={isEditMode ? null : footer}
      leftSlot={leftArrowSlot}
      rightSlot={rightArrowSlot}
    >
      {isEditMode && currentShot ? (
        <ShotEditForm
          shot={currentShot}
          onSuccess={handleEditSuccess}
          onCancel={handleEditCancel}
          onDelete={onDelete}
        />
      ) : (
        <div
          className="space-y-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Flex row: beanName, dose, ratio, rating */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                  {shot.beanName || "Unknown bean"}
                </p>
                {shot.doseGrams && (
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-300">
                    {roundToOneDecimal(shot.doseGrams)}g
                  </span>
                )}
                {ratio && (
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-300">
                    1:{ratio}
                  </span>
                )}
                {shot.rating != null && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    ⭐ {shot.rating} {formatRating(shot.rating)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                by {shot.userName || "Unknown user"} ·{" "}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <BookmarkIconSolid className="h-3.5 w-3.5" />
                Reference
              </span>
            )}
          </div>

          {/* Setup Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("setup")}
              className="flex w-full items-center justify-between py-2"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Setup
              </h3>
              {expandedSections.has("setup") ? (
                <ChevronUpIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              )}
            </button>
            {expandedSections.has("setup") && (
              <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
                <DetailRow label="Bean" value={shot.beanName} />
                <DetailRow label="Roast Level" value={shot.beanRoastLevel} />
                <DetailRow label="Grinder" value={shot.grinderName} />
                <DetailRow label="Machine" value={shot.machineName} />
                <DetailRow label="Days Post Roast" value={shot.daysPostRoast} />
              </div>
            )}
          </div>

          {/* Recipe Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("recipe")}
              className="flex w-full items-center justify-between py-2"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Recipe
              </h3>
              {expandedSections.has("recipe") ? (
                <ChevronUpIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              )}
            </button>
            {expandedSections.has("recipe") && (
              <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
                <DetailRow
                  label="Dose"
                  value={`${roundToOneDecimal(shot.doseGrams)}g`}
                />
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
                  value={
                    shot.brewPressure
                      ? `${roundToOneDecimal(shot.brewPressure)} bar`
                      : null
                  }
                />
                {shot.toolsUsed && shot.toolsUsed.length > 0 && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Tools Used
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {shot.toolsUsed.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                        >
                          {toolMap.get(t) || t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Section */}
          {(shot.brewTimeSecs ||
            shot.yieldActualGrams ||
            shot.estimateMaxPressure) && (
            <div>
              <button
                type="button"
                onClick={() => toggleSection("results")}
                className="flex w-full items-center justify-between py-2"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                  Results
                </h3>
                {expandedSections.has("results") ? (
                  <ChevronUpIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                )}
              </button>
              {expandedSections.has("results") && (
                <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
                  {shot.yieldActualGrams && (
                    <DetailRow
                      label="Actual Yield"
                      value={`${roundToOneDecimal(shot.yieldActualGrams)}g`}
                      subtitle={actualRatio ? `1:${actualRatio}` : "-/-"}
                    />
                  )}
                  {shot.brewTimeSecs && (
                    <DetailRow
                      label="Brew Time"
                      value={`${roundToOneDecimal(shot.brewTimeSecs)}s`}
                      subtitle={
                        shot.flowRate
                          ? `${roundToOneDecimal(shot.flowRate)} g/s`
                          : "-:-"
                      }
                    />
                  )}
                  {shot.estimateMaxPressure && (
                    <DetailRow
                      label="Est. Max Pressure"
                      value={`${roundToOneDecimal(shot.estimateMaxPressure)} bar`}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metrics Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("metrics")}
              className="flex w-full items-center justify-between py-2"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Metrics
              </h3>
              {expandedSections.has("metrics") ? (
                <ChevronUpIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              )}
            </button>
            {expandedSections.has("metrics") && (
              <div className="space-y-4 rounded-lg border border-stone-200 px-4 py-3 dark:border-stone-700">
                {/* Yield Accuracy */}
                {metrics?.yieldAccuracyPct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Yield Accuracy
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        metrics.yieldAccuracyPct <= 5
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : metrics.yieldAccuracyPct <= 15
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {roundToOneDecimal(metrics.yieldAccuracyPct)}%
                    </span>
                  </div>
                )}

                {/* Rating Distribution */}
                {metrics?.ratingDistribution &&
                  metrics.ratingDistribution.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                        Rating Distribution
                      </p>
                      <div className="space-y-1.5">
                        {metrics.ratingDistribution.map((item) => {
                          const maxCount = Math.max(
                            ...metrics.ratingDistribution.map((d) => d.count),
                            1,
                          );
                          const widthPct =
                            maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          const isCurrentShot =
                            metrics.currentShotRating != null &&
                            Math.floor(metrics.currentShotRating) ===
                              item.rating;

                          return (
                            <div
                              key={item.rating}
                              className="flex items-center gap-2"
                            >
                              <span className="w-8 text-xs font-medium text-stone-600 dark:text-stone-400">
                                {item.rating}
                              </span>
                              <div className="flex-1">
                                <div className="relative h-5 overflow-hidden rounded bg-stone-100 dark:bg-stone-800">
                                  <div
                                    className={`h-full transition-all ${
                                      isCurrentShot
                                        ? "bg-blue-500 dark:bg-blue-600"
                                        : "bg-stone-300 dark:bg-stone-600"
                                    }`}
                                    style={{ width: `${widthPct}%` }}
                                  />
                                  {isCurrentShot && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-semibold text-white">
                                        ⭐
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="w-8 text-right text-xs text-stone-500 dark:text-stone-400">
                                {item.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {metrics.currentShotRating != null && (
                        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                          ⭐ Current shot:{" "}
                          {roundToOneDecimal(metrics.currentShotRating)}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Tasting Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("tasting")}
              className="flex w-full items-center justify-between py-2"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Tasting
              </h3>
              {expandedSections.has("tasting") ? (
                <ChevronUpIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              )}
            </button>
            {expandedSections.has("tasting") && (
              <div className="space-y-3">
                {/* Shot Quality */}
                <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
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
                  <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Rating
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {shot.rating}
                      </span>
                      <span className="text-lg">
                        {formatRating(shot.rating)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Bitter */}
                {shot.bitter != null && (
                  <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Bitter
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: getBitterColor(shot.bitter) }}
                      />
                      <span
                        className="text-2xl font-bold"
                        style={{ color: getBitterColor(shot.bitter) }}
                      >
                        {shot.bitter}
                      </span>
                      <span className="text-sm text-stone-400 dark:text-stone-500">
                        / 5
                      </span>
                    </span>
                  </div>
                )}

                {/* Sour */}
                {shot.sour != null && (
                  <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      Sour
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: getSourColor(shot.sour) }}
                      />
                      <span
                        className="text-2xl font-bold"
                        style={{ color: getSourColor(shot.sour) }}
                      >
                        {shot.sour}
                      </span>
                      <span className="text-sm text-stone-400 dark:text-stone-500">
                        / 5
                      </span>
                    </span>
                  </div>
                )}

                {/* Body */}
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
                          color: getBodyColor(
                            shot.bodyTexture[shot.bodyTexture.length - 1],
                          ),
                          key: shot.bodyTexture[shot.bodyTexture.length - 1],
                          className: "capitalize",
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Flavors */}
                {shot.flavors && shot.flavors.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                      Flavors
                    </p>
                    <SelectedBadges
                      title=""
                      items={shot.flavors.map((flavorName) => {
                        // Find the path for this flavor name in the tree
                        const findFlavorPath = (
                          node: FlavorNode,
                          path: string[] = [],
                        ): string[] | null => {
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

                {/* Adjectives */}
                {shot.adjectives && shot.adjectives.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                      Adjectives
                    </p>
                    <SelectedBadges
                      title=""
                      items={shot.adjectives.map((adjective) => ({
                        label: adjective,
                        color: getAdjectiveColor(adjective),
                        key: adjective,
                      }))}
                    />
                  </div>
                )}

                {/* Notes */}
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
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
