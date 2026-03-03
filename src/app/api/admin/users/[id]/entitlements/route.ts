import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { userEntitlements, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as z from "zod";

const bodySchema = z.object({
  lookupKey: z.string().min(1),
});

/** Grant an entitlement to a user. Idempotent. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .insert(userEntitlements)
    .values({ userId: id, lookupKey: parsed.data.lookupKey })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

/** Revoke an entitlement from a user. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const deleted = await db
    .delete(userEntitlements)
    .where(
      and(
        eq(userEntitlements.userId, id),
        eq(userEntitlements.lookupKey, parsed.data.lookupKey)
      )
    )
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Entitlement not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
