import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as z from "zod";

const upsertSchema = z.object({
  status: z.enum(["active", "canceled", "past_due", "trialing", "incomplete"]),
  currentPeriodEnd: z.string().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

/** Create or update a subscription record for a user. No Stripe calls — DB only. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  // Ensure user exists
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, currentPeriodEnd, cancelAtPeriodEnd } = parsed.data;

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        status,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(subscriptions)
    .values({
      userId: id,
      status,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

/** Delete the subscription record for a user. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const deleted = await db
    .delete(subscriptions)
    .where(eq(subscriptions.userId, id))
    .returning({ id: subscriptions.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
