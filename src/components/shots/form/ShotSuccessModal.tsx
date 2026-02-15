"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { AppRoutes } from "@/app/routes";

interface ShotSummary {
  shotId: string;
  doseGrams: number;
  yieldGrams: number;
  yieldActualGrams?: number;
  brewTimeSecs?: number;
  shotQuality: number;
  rating?: number;
  notes?: string;
}

interface ShotSuccessModalProps {
  open: boolean;
  onClose: () => void;
  summary: ShotSummary | null;
}

export function ShotSuccessModal({ open, onClose, summary }: ShotSuccessModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const shareUrl = summary
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${AppRoutes.history.path}?shotId=${summary.shotId}`
    : "";

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Espresso Shot",
          text: `Check out my espresso shot — Quality: ${summary?.shotQuality}/5${summary?.rating ? `, Rating: ${summary.rating}/5` : ""}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [shareUrl, summary]);

  if (!open || !summary) return null;

  const actualYield = summary.yieldActualGrams ?? summary.yieldGrams;
  const ratio = summary.doseGrams > 0
    ? (actualYield / summary.doseGrams).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        {/* Close button — large, top right */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Success header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">
            Shot Logged!
          </h2>
        </div>

        {/* Summary */}
        <div className="mb-5 space-y-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-800">
          <div className="flex flex-wrap gap-2">
            <SummaryBadge label="Quality" value={`${summary.shotQuality}/5`} />
            {summary.rating != null && (
              <SummaryBadge label="Rating" value={`${summary.rating}/5`} />
            )}
            {summary.brewTimeSecs != null && (
              <SummaryBadge label="Time" value={`${summary.brewTimeSecs}s`} />
            )}
            {ratio && (
              <SummaryBadge label="Ratio" value={`1:${ratio}`} />
            )}
          </div>

          <div className="text-sm text-stone-500 dark:text-stone-400">
            {summary.doseGrams}g in → {actualYield}g out
          </div>

          {summary.notes && (
            <p className="line-clamp-3 text-sm italic text-stone-600 dark:text-stone-300">
              &ldquo;{summary.notes}&rdquo;
            </p>
          )}
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
            onClick={handleShare}
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
              router.push(AppRoutes.log.path);
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

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      <span className="text-amber-600/70 dark:text-amber-400/70">{label}</span>
      {value}
    </span>
  );
}
