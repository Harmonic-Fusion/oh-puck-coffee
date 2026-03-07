import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { subscriptions, userEntitlements } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Entitlements } from "@/shared/entitlements";

/**
 * GET /api/admin/subscriptions/mismatch-count
 * Returns count of subscriptions that are active/trialing but user lacks no-shot-view-limit.
 */
export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const activeSubs = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      inArray(subscriptions.status, ["active", "trialing"]),
    );

  const userIds = [...new Set(activeSubs.map((s) => s.userId))];
  if (userIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const hasPro = new Set(
    (
      await db
        .select({ userId: userEntitlements.userId })
        .from(userEntitlements)
        .where(
          and(
            inArray(userEntitlements.userId, userIds),
            eq(userEntitlements.lookupKey, Entitlements.NO_SHOT_VIEW_LIMIT),
          ),
        )
    ).map((r) => r.userId),
  );

  const count = userIds.filter((id) => !hasPro.has(id)).length;
  return NextResponse.json({ count });
}
