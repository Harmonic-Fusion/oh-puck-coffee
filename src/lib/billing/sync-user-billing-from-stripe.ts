import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, userEntitlements, users } from "@/db/schema";
import { createLogger } from "@/lib/logger";
import { getStripeClient } from "@/lib/billing/stripe";
import { config } from "@/shared/config";

const billingSyncLogger = createLogger("billing-sync", "info");

export type SyncUserBillingResult =
  | { ok: true; skipped: "no_stripe_api_key" | "no_stripe_customer" }
  | {
      ok: true;
      skipped?: undefined;
      stripeCustomerId: string;
      subscription: "upserted" | "none";
      entitlementCount: number;
    }
  | { ok: false; error: string };

/**
 * Pulls the customer's subscription row and active entitlements from Stripe
 * and mirrors them into `subscriptions` and `user_entitlements`.
 * Used after portal/checkout changes and on JWT refresh (throttled).
 */
export async function syncUserBillingFromStripe(
  userId: string,
): Promise<SyncUserBillingResult> {
  if (!config.stripeApiKey) {
    billingSyncLogger.debug("Skipping Stripe sync: STRIPE_API_KEY not set", {
      userId,
    });
    return { ok: true, skipped: "no_stripe_api_key" };
  }

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const customerId = user?.stripeCustomerId;
  if (!customerId) {
    return { ok: true, skipped: "no_stripe_customer" };
  }

  try {
    const stripe = getStripeClient();

    const [subsRes, entitlementsRes] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, limit: 10 }),
      stripe.entitlements.activeEntitlements.list({
        customer: customerId,
        limit: 100,
      }),
    ]);

    const sub =
      subsRes.data.find((s) => s.status === "active" || s.status === "trialing") ??
      subsRes.data[0];

    let subscriptionResult: "upserted" | "none" = "none";

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
          userId,
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

      subscriptionResult = "upserted";
    }

    const activeKeys = entitlementsRes.data.map((e) => e.lookup_key);

    await db.delete(userEntitlements).where(eq(userEntitlements.userId, userId));

    if (activeKeys.length > 0) {
      await db.insert(userEntitlements).values(
        activeKeys.map((key) => ({ userId, lookupKey: key })),
      );
    }

    billingSyncLogger.info("Stripe billing synced for user", {
      userId,
      customerId,
      subscription: subscriptionResult,
      stripeSubscriptionId: sub?.id ?? null,
      stripeSubscriptionStatus: sub?.status ?? null,
      entitlementCount: activeKeys.length,
      entitlementLookupKeys: activeKeys,
    });

    return {
      ok: true,
      stripeCustomerId: customerId,
      subscription: subscriptionResult,
      entitlementCount: activeKeys.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    billingSyncLogger.error("Stripe billing sync failed", {
      userId,
      customerId,
      error: message,
    });
    return { ok: false, error: message };
  }
}
