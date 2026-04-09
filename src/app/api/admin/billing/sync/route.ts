import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { syncUserBillingFromStripe } from "@/lib/billing/sync-user-billing-from-stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isNotNull } from "drizzle-orm";

interface SyncResult {
  userId: string;
  email: string | null;
  stripeCustomerId: string;
  subscription: "upserted" | "none" | "error";
  entitlements: number | "error";
  error?: string;
}

export async function POST() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  // Get all users with a Stripe customer ID
  const stripeUsers = await db
    .select({
      id: users.id,
      email: users.email,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(isNotNull(users.stripeCustomerId));

  const results: SyncResult[] = [];

  for (const user of stripeUsers) {
    const customerId = user.stripeCustomerId!;
    const result: SyncResult = {
      userId: user.id,
      email: user.email,
      stripeCustomerId: customerId,
      subscription: "none",
      entitlements: 0,
    };

    try {
      const syncResult = await syncUserBillingFromStripe(user.id);
      if (!syncResult.ok) {
        result.error = syncResult.error;
        result.subscription = "error";
        result.entitlements = "error";
      } else if (syncResult.skipped) {
        result.subscription = "none";
        result.entitlements = 0;
      } else {
        result.subscription = syncResult.subscription;
        result.entitlements = syncResult.entitlementCount;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      if (result.subscription !== "upserted") result.subscription = "error";
      result.entitlements = "error";
    }

    results.push(result);
  }

  const synced = results.filter((r) => r.subscription === "upserted").length;
  const errors = results.filter((r) => r.error).length;

  return NextResponse.json({ synced, errors, total: results.length, results });
}
