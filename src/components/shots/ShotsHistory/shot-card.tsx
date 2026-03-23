"use client";

import { useMemo, useRef, useEffect, useCallback } from "react";
import {
  useCreateShareLink,
  type ShotWithJoins,
} from "@/components/shots/hooks";
import { ActionButtonBar } from "@/components/shots/ActionButtonBar";
import { useShotActions } from "@/components/shots/useShotActions";
import { AppRoutes, resolvePath } from "@/app/routes";
import type { ShotShareData } from "@/lib/share-text";
import { cn } from "@/lib/utils";
import { BookmarkIcon as BookmarkIconSolid } from "@heroicons/react/24/solid";

export interface ShotsHistoryShotCardProps {
  shot: ShotWithJoins;
  tempUnit: "C" | "F";
  onToggleReference?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onClick?: (shot: ShotWithJoins) => void;
  onEdit?: (shot: ShotWithJoins) => void;
  onDuplicate?: (shot: ShotWithJoins) => void;
  onSelect?: (shot: ShotWithJoins) => void;
  isSelected?: boolean;
  isSelecting?: boolean;
}

export function ShotsHistoryShotCard({
  shot,
  tempUnit,
  onToggleReference,
  onToggleHidden,
  onClick,
  onEdit,
  onDuplicate,
  onSelect,
  isSelected,
  isSelecting,
}: ShotsHistoryShotCardProps) {
  const date = new Date(shot.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const ratio = shot.brewRatio != null ? `1:${shot.brewRatio}` : "—";
  const isRef = shot.isReferenceShot;

  const createShareLink = useCreateShareLink();
  const shotIdRef = useRef(shot.id);
  useEffect(() => {
    shotIdRef.current = shot.id;
  }, [shot.id]);

  const shotShareData = useMemo<ShotShareData>(
    () => ({
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
    }),
    [shot],
  );

  const getShareUrl = useCallback(async (): Promise<string> => {
    const currentShotId = shotIdRef.current;
    if (!currentShotId) throw new Error("Shot ID is required");

    const shareData = await new Promise<{ id: string }>((resolve, reject) => {
      createShareLink.mutate(currentShotId, {
        onSuccess: (data) => resolve(data),
        onError: reject,
      });
    });

    if (!shareData?.id) throw new Error("Failed to create share link");
    return `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: shareData.id })}`;
  }, [createShareLink]);

  const handleShareAction = useCallback(
    async (text: string, shareUrl: string) => {
      const shareDataObj = {
        title: "Journey before Destination!",
        text,
        url: shareUrl,
      };

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        try {
          if (navigator.canShare(shareDataObj)) {
            await navigator.share(shareDataObj);
            return;
          }
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Error sharing:", err);
          }
        }
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch (clipboardErr) {
        console.error("Error copying to clipboard:", clipboardErr);
      }
    },
    [],
  );

  const shotActions = useShotActions({
    shot,
    tempUnit,
    shotShareData,
    getShareUrl,
    onShare: handleShareAction,
    onEdit: onEdit ? () => onEdit(shot) : onClick ? () => onClick(shot) : undefined,
    onToggleReference: onToggleReference
      ? () => onToggleReference(shot.id)
      : undefined,
    onToggleHidden: onToggleHidden ? () => onToggleHidden(shot.id) : undefined,
    onDuplicate: onDuplicate ? () => onDuplicate(shot) : undefined,
    showEdit: !!onEdit,
  });

  return (
    <div
      onClick={() => {
        if (isSelecting && onSelect) {
          onSelect(shot);
        } else {
          onClick?.(shot);
        }
      }}
      className={cn(
        "relative rounded-xl border bg-white p-4 transition-colors dark:bg-stone-900",
        onClick || (isSelecting && onSelect)
          ? "cursor-pointer active:bg-stone-50 dark:active:bg-stone-800"
          : "",
        isRef
          ? "border-amber-700 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-900/10"
          : "border-stone-200 dark:border-stone-700",
        isSelected
          ? " border-amber-700 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-900/20"
          : "",
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-800 dark:text-stone-200">
            {shot.beanName ?? "Unknown Bean"}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">{date}</p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {shot.shotQuality}/5
          </span>
          {shot.rating != null && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {shot.rating}/5
            </span>
          )}
          {isRef && <BookmarkIconSolid className="h-4 w-4 text-amber-500" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Dose", value: shot.doseGrams ? `${shot.doseGrams}g` : "—" },
          {
            label: "Yield",
            value: shot.yieldGrams ? `${shot.yieldGrams}g` : "—",
          },
          { label: "Ratio", value: ratio },
          {
            label: "Time",
            value: shot.brewTimeSecs ? `${shot.brewTimeSecs}s` : "—",
          },
          { label: "Grind", value: shot.grindLevel ?? "—" },
          { label: "By", value: shot.userName ?? "—" },
        ].map((cell) => (
          <div
            key={cell.label}
            className="rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {cell.label}
            </p>
            <p className="truncate text-sm font-semibold text-stone-700 dark:text-stone-300">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      {shot.notes && (
        <p className="mt-3 truncate border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          {shot.notes}
        </p>
      )}

      {(onToggleReference || onToggleHidden || onDuplicate || onEdit || onSelect) && (
        <div
          className="mt-3 flex h-10 w-full items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {!isSelecting ? (
            <div className="flex-[0.9]">
              <ActionButtonBar actions={shotActions} />
            </div>
          ) : (
            <div className="flex-[0.9]">
              <>
                {onEdit && <div className="h-10 flex-1" aria-hidden="true" />}
                {onToggleReference && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                {onToggleHidden && (
                  <div className="h-10 flex-1" aria-hidden="true" />
                )}
                {onDuplicate && <div className="h-10 flex-1" aria-hidden="true" />}
                <div className="h-10 flex-1" aria-hidden="true" />
              </>
            </div>
          )}
          {onSelect && (
            <div className="flex-[0.1] flex justify-end">
              <input
                type="checkbox"
                checked={isSelected ?? false}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(shot);
                }}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
                title="Select"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
