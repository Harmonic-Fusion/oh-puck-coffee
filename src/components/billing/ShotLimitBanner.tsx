"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";

interface ShotLimitBannerProps {
  totalCount: number;
  limit: number;
}

export function ShotLimitBanner({ totalCount, limit }: ShotLimitBannerProps) {
  const { data: session } = useSession();

  // Don't render for users with the unlimited entitlement
  if (hasEntitlement(session?.user.entitlements, Entitlements.NO_SHOT_VIEW_LIMIT)) {
    return null;
  }

  const isAtLimit = totalCount >= limit;
  const isNearLimit = !isAtLimit && totalCount >= limit * 0.9;

  if (!isNearLimit && !isAtLimit) return null;

  if (isAtLimit) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-400">
          You&apos;ve reached your {limit}-shot history limit. Older shots are
          hidden.{" "}
          <Link
            href={AppRoutes.billing.path}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Upgrade to Pro
          </Link>{" "}
          to view all your shots.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
      <p className="text-sm text-amber-700 dark:text-amber-400">
        You&apos;ve logged {totalCount} of {limit} shots.{" "}
        <Link
          href={AppRoutes.billing.path}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Upgrade to Pro
        </Link>{" "}
        for unlimited history.
      </p>
    </div>
  );
}
