import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { subscriptions, userEntitlements } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Entitlements } from "@/shared/entitlements";

/**
 * POST /api/admin/subscriptions/fix-entitlements
 * Ensures user_entitlements includes no-shot-view-limit for users with active/trialing subscription.
 * Body: { userId?: string } — if provided, fix only that user; otherwise fix all mismatched.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  let targetUserId: string | null = null;
  try {
    const body = await request.json();
    if (body && typeof body.userId === "string" && body.userId) {
      targetUserId = body.userId;
    }
  } catch {
    // no body or invalid JSON — fix all
  }

  const activeStatuses = ["active", "trialing"] as const;

  const subs = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      targetUserId
        ? and(
            eq(subscriptions.userId, targetUserId),
            inArray(subscriptions.status, activeStatuses),
          )
        : inArray(subscriptions.status, activeStatuses),
    );

  const userIdsToFix = [...new Set(subs.map((s) => s.userId))];

  if (userIdsToFix.length === 0) {
    return NextResponse.json({ fixed: 0, total: 0 });
  }

  const existing = new Set(
    (
      await db
        .select({ userId: userEntitlements.userId })
        .from(userEntitlements)
        .where(
          and(
            inArray(userEntitlements.userId, userIdsToFix),
            eq(userEntitlements.lookupKey, Entitlements.NO_SHOT_VIEW_LIMIT),
          ),
        )
    ).map((r) => r.userId),
  );

  const missing = userIdsToFix.filter((id) => !existing.has(id));
  let fixed = 0;

  for (const userId of missing) {
    try {
      await db
        .insert(userEntitlements)
        .values({ userId, lookupKey: Entitlements.NO_SHOT_VIEW_LIMIT })
        .onConflictDoNothing();
      fixed += 1;
    } catch (err) {
      console.error("[fix-entitlements] Failed for user", userId, err);
    }
  }

  return NextResponse.json({ fixed, total: missing.length });
}
