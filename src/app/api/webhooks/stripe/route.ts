import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getStripeClient } from "@/lib/billing/stripe";
import { db } from "@/db";
import { users, subscriptions, userEntitlements } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { Entitlements } from "@/shared/entitlements";
import { createLogger } from "@/lib/logger";
import "@/lib/logger-init";

// Stripe sends the raw body for signature verification — do NOT parse as JSON.
export const runtime = "nodejs";

const webhookLogger = createLogger("stripe-webhook", "info");

async function syncEntitlementsFromSubscription(
  userId: string,
  stripeProductId: string | null,
  status: string,
): Promise<void> {
  await db.delete(userEntitlements).where(eq(userEntitlements.userId, userId));

  const isActive =
    status === "active" || status === "trialing";
  if (!isActive || !stripeProductId) {
    webhookLogger.info("Subscription sync: cleared entitlements (inactive or no product)", {
      userId,
      status,
      stripeProductId,
    });
    return;
  }

  try {
    const stripe = getStripeClient();
    const pf = await stripe.products.listFeatures(stripeProductId, {
      limit: 100,
    });
    const lookupKeys = pf.data.map(
      (f) => (f as { entitlement_feature?: { lookup_key: string } }).entitlement_feature?.lookup_key,
    ).filter((key): key is string => typeof key === "string");

    // Any active subscription = Pro: always include no-shot-view-limit; merge with product features
    const proKey = Entitlements.NO_SHOT_VIEW_LIMIT;
    const keysToInsert =
      lookupKeys.length > 0
        ? lookupKeys.includes(proKey)
          ? lookupKeys
          : [proKey, ...lookupKeys]
        : [proKey];
    await db.insert(userEntitlements).values(
      keysToInsert.map((lookupKey) => ({ userId, lookupKey })),
    );
    webhookLogger.info("Subscription sync: wrote entitlements from product features", {
      userId,
      stripeProductId,
      status,
      lookupKeys: keysToInsert,
    });
  } catch (err) {
    webhookLogger.error("Failed to sync product features to entitlements", {
      userId,
      stripeProductId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    webhookLogger.error("Signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  webhookLogger.info("Stripe webhook received", {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && session.client_reference_id) {
          // Link stripeCustomerId to the user row
          await db
            .update(users)
            .set({ stripeCustomerId: String(session.customer) })
            .where(eq(users.id, session.client_reference_id));
          webhookLogger.info("checkout.session.completed: linked Stripe customer", {
            userId: session.client_reference_id,
            customerId: String(session.customer),
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // current_period_start/end are in the Stripe API but not typed in v20 SDK
        const sub = event.data.object as Stripe.Subscription & {
          current_period_start?: number;
          current_period_end?: number;
        };
        const customerId = String(sub.customer);

        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);

        if (!user) {
          webhookLogger.warn("Subscription event: no user for Stripe customer", {
            customerId,
            subscriptionId: sub.id,
            status: sub.status,
          });
          break;
        }

        const item = sub.items.data[0];
        const status = sub.status as
          | "active"
          | "canceled"
          | "past_due"
          | "trialing"
          | "incomplete";

        const periodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;

        await db
          .insert(subscriptions)
          .values({
            userId: user.id,
            stripeSubscriptionId: sub.id,
            stripeProductId: item?.price.product
              ? String(item.price.product)
              : null,
            stripePriceId: item?.price.id ?? null,
            status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
              stripeSubscriptionId: sub.id,
              stripeProductId: item?.price.product
                ? String(item.price.product)
                : null,
              stripePriceId: item?.price.id ?? null,
              status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date(),
            },
          });

        const productId =
          item?.price.product != null ? String(item.price.product) : null;
        await syncEntitlementsFromSubscription(user.id, productId, status);
        webhookLogger.info("customer.subscription: updated DB subscription row", {
          userId: user.id,
          subscriptionId: sub.id,
          status,
          stripeProductId: productId,
          stripePriceId: item?.price.id ?? null,
        });
        break;
      }

      case "entitlements.active_entitlement_summary.updated": {
        const summary = event.data.object as {
          customer: string;
          entitlements: { data: Array<{ lookup_key: string }> };
        };
        const customerId = summary.customer;

        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);

        if (!user) {
          webhookLogger.warn("entitlement summary: no user for Stripe customer", {
            customerId,
          });
          break;
        }

        const activeKeys = summary.entitlements.data.map((e) => e.lookup_key);

        // Replace all entitlements for this user
        await db
          .delete(userEntitlements)
          .where(eq(userEntitlements.userId, user.id));

        if (activeKeys.length > 0) {
          await db.insert(userEntitlements).values(
            activeKeys.map((key) => ({ userId: user.id, lookupKey: key })),
          );
        }
        webhookLogger.info("entitlements.active_entitlement_summary: replaced user entitlements", {
          userId: user.id,
          customerId,
          lookupKeys: activeKeys,
        });
        break;
      }

      default:
        webhookLogger.debug("Unhandled Stripe event type (ignored)", {
          type: event.type,
          id: event.id,
        });
        break;
    }
  } catch (err) {
    webhookLogger.error("Webhook handler error", {
      eventId: event.id,
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
