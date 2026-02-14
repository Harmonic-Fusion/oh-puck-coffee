"use client";

import { useState, useRef, useEffect } from "react";
import { useShot, type ShotWithJoins } from "@/components/shots/hooks";
import { Button } from "@/components/common/Button";

interface PreviousShotRowProps {
  shotId: string | null;
  onViewShot?: (shot: ShotWithJoins) => void;
}

function ShotBadges({
  shotQuality,
  rating,
  brewTimeSecs,
  ratio,
}: {
  shotQuality: number | null;
  rating: number | null;
  brewTimeSecs: string | null;
  ratio: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shotQuality != null && (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Quality: {shotQuality}/5
        </span>
      )}
      {rating != null && (
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Rating: {rating}/5
        </span>
      )}
      {brewTimeSecs && (
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
          {parseFloat(brewTimeSecs)}s
        </span>
      )}
      {ratio && (
        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          1:{ratio}
        </span>
      )}
    </div>
  );
}

function TruncatedNotes({ notes }: { notes: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const MAX_HEIGHT_PX = 480; // 30rem = 480px

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      setNeedsTruncation(scrollHeight > MAX_HEIGHT_PX);
    }
  }, [notes]);

  // If content doesn't need truncation, just show it normally
  if (!needsTruncation) {
    return (
      <div className="mb-3">
        <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
          {notes}
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`mb-3 cursor-pointer ${!isExpanded ? "hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg p-2 -m-2" : ""}`}
    >
      <div className="relative">
        <div
          ref={contentRef}
          className={`text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap ${
            !isExpanded ? "overflow-hidden" : ""
          }`}
          style={!isExpanded ? { maxHeight: "30rem" } : undefined}
        >
          {notes}
        </div>
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent via-stone-50/60 to-stone-50 dark:via-stone-800/60 dark:to-stone-800 pointer-events-none" />
        )}
      </div>
      {!isExpanded ? (
        <div className="flex justify-center mt-2">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      ) : (
        <div className="flex justify-center mt-2">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export function PreviousShotRow({ shotId, onViewShot }: PreviousShotRowProps) {
  const { data: shot, isLoading } = useShot(shotId);

  if (!shotId) return null;

  const handleViewShot = () => {
    if (!shot || !onViewShot) return;
    onViewShot(shot);
  };

  if (isLoading || !shot) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Previous Shot
          </h3>
        </div>
        <div className="text-sm text-stone-500 dark:text-stone-400">
          Loading...
        </div>
      </div>
    );
  }

  const dose = parseFloat(shot.doseGrams);
  const yieldG = parseFloat(shot.yieldGrams);
  const ratio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Previous Shot
        </h3>
        {onViewShot && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleViewShot}
          >
            View Shot
          </Button>
        )}
      </div>

      <ShotBadges
        shotQuality={shot.shotQuality}
        rating={shot.rating}
        brewTimeSecs={shot.brewTimeSecs}
        ratio={ratio}
      />

      {shot.notes && (
        <div className="mt-3">
          <TruncatedNotes notes={shot.notes} />
        </div>
      )}

    </div>
  );
}
