import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getStripeClient } from "@/lib/billing/stripe";
import { db } from "@/db";
import { users, subscriptions, userEntitlements } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import type Stripe from "stripe";

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

  const stripe = getStripeClient();

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
      // Fetch subscriptions and active entitlements in parallel
      const [subsRes, entitlementsRes] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, limit: 10 }),
        stripe.entitlements.activeEntitlements.list({ customer: customerId, limit: 100 }),
      ]);

      // Sync the most recent active subscription (or first if none active)
      const sub =
        subsRes.data.find((s) => s.status === "active" || s.status === "trialing") ??
        subsRes.data[0];

      if (sub) {
        const typedSub = sub as Stripe.Subscription & {
          current_period_start?: number;
          current_period_end?: number;
        };

        const item = typedSub.items.data[0];
        const status = typedSub.status as
          | "active"
          | "canceled"
          | "past_due"
          | "trialing"
          | "incomplete";

        const periodStart = typedSub.current_period_start
          ? new Date(typedSub.current_period_start * 1000)
          : null;
        const periodEnd = typedSub.current_period_end
          ? new Date(typedSub.current_period_end * 1000)
          : null;

        await db
          .insert(subscriptions)
          .values({
            userId: user.id,
            stripeSubscriptionId: typedSub.id,
            stripeProductId: item?.price.product ? String(item.price.product) : null,
            stripePriceId: item?.price.id ?? null,
            status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: typedSub.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
              stripeSubscriptionId: typedSub.id,
              stripeProductId: item?.price.product ? String(item.price.product) : null,
              stripePriceId: item?.price.id ?? null,
              status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: typedSub.cancel_at_period_end,
              updatedAt: new Date(),
            },
          });

        result.subscription = "upserted";
      }

      // Replace all entitlements for this user with what Stripe says is active
      const activeKeys = entitlementsRes.data.map((e) => e.lookup_key);

      await db.delete(userEntitlements).where(eq(userEntitlements.userId, user.id));

      if (activeKeys.length > 0) {
        await db
          .insert(userEntitlements)
          .values(activeKeys.map((key) => ({ userId: user.id, lookupKey: key })));
      }

      result.entitlements = activeKeys.length;
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
