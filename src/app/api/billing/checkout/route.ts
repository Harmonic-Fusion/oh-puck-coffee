import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createCheckoutSession, resolveStripeCustomerId } from "@/lib/billing/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppRoutes } from "@/app/routes";
import { config } from "@/shared/config";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { priceId } = body as { priceId?: string };

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { customerId, shouldPersist } = await resolveStripeCustomerId(
    dbUser.id,
    dbUser.email ?? "",
    dbUser.stripeCustomerId,
  );
  if (shouldPersist) {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, dbUser.id));
  }

  const baseUrl = config.nextAuthUrl;
  const returnUrl = `${baseUrl}${AppRoutes.billing.path}`;

  const { url } = await createCheckoutSession(customerId, priceId, returnUrl);
  return NextResponse.json({ url });
}
