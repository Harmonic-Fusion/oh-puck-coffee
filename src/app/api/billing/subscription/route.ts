import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [sub] = await db
    .select({
      status: subscriptions.status,
      stripeProductId: subscriptions.stripeProductId,
      stripePriceId: subscriptions.stripePriceId,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, session!.user.id))
    .limit(1);

  if (!sub) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(sub);
}
