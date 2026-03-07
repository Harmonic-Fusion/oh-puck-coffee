"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { BeanShotWithUser, BeanShotContributor } from "@/components/beans/hooks";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtNum(v: string | number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toFixed(decimals);
}

function UserAvatar({
  name,
  image,
  size = 24,
}: {
  name: string | null;
  image: string | null;
  size?: number;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image src={image} alt={name ?? ""} fill className="object-cover" />
      ) : (
        <span
          className="font-medium text-stone-600 dark:text-stone-400"
          style={{ fontSize: size * 0.42 }}
        >
          {(name ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

interface ShotCardProps {
  shot: BeanShotWithUser;
  isCurrentUser: boolean;
  showUser: boolean;
}

function ShotCard({ shot, isCurrentUser, showUser }: ShotCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasFlavors = (shot.flavors?.length ?? 0) > 0;
  const hasBody = (shot.bodyTexture?.length ?? 0) > 0;
  const hasAdjectives = (shot.adjectives?.length ?? 0) > 0;
  const hasExtra = hasFlavors || hasBody || hasAdjectives || shot.notes;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:bg-stone-900",
        shot.isHidden
          ? "border-stone-200/60 opacity-60 dark:border-stone-800/60"
          : isCurrentUser
            ? "border-stone-200 dark:border-stone-700"
            : "border-amber-200 dark:border-amber-800/50",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {showUser && (
            <UserAvatar
              name={shot.userName}
              image={shot.userImage}
              size={28}
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {fmtDate(shot.createdAt)}
            </p>
            {showUser && shot.userName && (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {isCurrentUser ? "You" : shot.userName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {shot.rating && (
            <span className="flex items-center gap-0.5 text-sm font-semibold text-amber-600 dark:text-amber-500">
              ★ {parseFloat(shot.rating).toFixed(1)}
            </span>
          )}
          {shot.shotQuality && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              Q {parseFloat(shot.shotQuality).toFixed(1)}
            </span>
          )}
          {shot.isHidden && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-400 dark:bg-stone-800">
              Hidden
            </span>
          )}
          {shot.isReferenceShot && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Ref
            </span>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {[
          { label: "Dose", value: shot.doseGrams ? `${fmtNum(shot.doseGrams)}g` : null },
          { label: "Yield", value: shot.yieldGrams ? `${fmtNum(shot.yieldGrams)}g` : null },
          { label: "Ratio", value: shot.brewRatio ? `1:${shot.brewRatio.toFixed(2)}` : null },
          { label: "Time", value: shot.brewTimeSecs ? `${fmtNum(shot.brewTimeSecs)}s` : null },
          { label: "Grind", value: shot.grindLevel ? fmtNum(shot.grindLevel, 2) : null },
        ]
          .filter((m) => m.value)
          .map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
                {m.label}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-stone-700 dark:text-stone-300">
                {m.value}
              </p>
            </div>
          ))}
      </div>

      {/* Expandable extra details */}
      {hasExtra && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {hasFlavors && (
                <div>
                  <p className="text-xs font-medium text-stone-400 dark:text-stone-500">
                    Flavors
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {shot.flavors!.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasBody && (
                <div>
                  <p className="text-xs font-medium text-stone-400 dark:text-stone-500">
                    Body / Texture
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {shot.bodyTexture!.map((b, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasAdjectives && (
                <div>
                  <p className="text-xs font-medium text-stone-400 dark:text-stone-500">
                    Adjectives
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {shot.adjectives!.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {shot.notes && (
                <div>
                  <p className="text-xs font-medium text-stone-400 dark:text-stone-500">
                    Notes
                  </p>
                  <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                    {shot.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ShotHistoryProps {
  shots: BeanShotWithUser[];
  contributors: BeanShotContributor[];
  currentUserId: string;
  isLoading: boolean;
}

export function ShotHistory({
  shots,
  contributors,
  currentUserId,
  isLoading,
}: ShotHistoryProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [showHidden, setShowHidden] = useState(false);

  const hasMultipleUsers = contributors.length > 1;

  const filteredShots = useMemo(() => {
    let result = shots;
    if (selectedUserId !== "all") {
      result = result.filter((s) => s.userId === selectedUserId);
    }
    if (!showHidden) {
      result = result.filter((s) => !s.isHidden);
    }
    return result;
  }, [shots, selectedUserId, showHidden]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800"
          />
        ))}
      </div>
    );
  }

  const allNonHidden = shots.filter((s) => !s.isHidden);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* User filter — only shown with multiple contributors */}
        {hasMultipleUsers && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
              User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <option value="all">All users</option>
              {contributors.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.isCurrentUser ? `You (${c.userName ?? "me"})` : (c.userName ?? "Unknown")}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded accent-amber-500"
            />
            Show hidden
          </label>
        </div>
        <span className="ml-auto text-xs text-stone-400">
          {allNonHidden.length} shot{allNonHidden.length !== 1 ? "s" : ""}
          {hasMultipleUsers && ` · ${contributors.length} contributors`}
        </span>
      </div>

      {/* Shot cards */}
      {filteredShots.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No shots to display.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredShots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              isCurrentUser={shot.userId === currentUserId}
              showUser={hasMultipleUsers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
