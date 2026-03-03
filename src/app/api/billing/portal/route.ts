import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createPortalSession, createOrRetrieveCustomer } from "@/lib/billing/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppRoutes } from "@/app/routes";
import { config } from "@/shared/config";

export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    customerId = await createOrRetrieveCustomer(dbUser.id, dbUser.email ?? "");
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, dbUser.id));
  }

  const baseUrl = config.nextAuthUrl;
  const returnUrl = `${baseUrl}${AppRoutes.settings.billing.path}`;

  const { url } = await createPortalSession(customerId, returnUrl);
  return NextResponse.json({ url });
}
