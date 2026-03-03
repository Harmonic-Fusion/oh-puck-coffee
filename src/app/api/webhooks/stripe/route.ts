import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { db } from "@/db";
import { users, subscriptions, userEntitlements } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

// Stripe sends the raw body for signature verification — do NOT parse as JSON.
export const runtime = "nodejs";

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
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

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

        if (!user) break;

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

        if (!user) break;

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
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
