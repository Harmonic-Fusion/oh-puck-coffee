import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
import { updateBeanShareSchema } from "@/shared/beans/schema";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";

/**
 * PATCH /api/beans/:id/shares/:shareId — Update a person's access (shareShotHistory, reshareEnabled).
 * Only bean creator or admin can update.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; shareId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId, shareId } = await params;

  const result = await canAccessBean(
    session.user.id,
    beanId,
    session.user.role,
  );

  if (!result.allowed) {
    return result.error;
  }

  const isCreatorOrAdmin =
    result.bean.createdBy === session.user.id ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  const body = await request.json();
  const parsed = updateBeanShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [share] = await db
    .select()
    .from(beansShare)
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    )
    .limit(1);

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const isSelf = share.userId === session.user.id;

  // Owner/admin can update any field. Members can only update their own shareShotHistory.
  if (!isCreatorOrAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shareShotHistory, reshareEnabled } = parsed.data;

  // Members cannot change reshareEnabled — only the owner/admin can
  if (!isCreatorOrAdmin && reshareEnabled !== undefined) {
    return NextResponse.json(
      { error: "Only the owner can change reshare permission" },
      { status: 403 },
    );
  }

  if (
    reshareEnabled === true &&
    !hasEntitlement(session.user.entitlements, Entitlements.BEAN_SHARE)
  ) {
    return NextResponse.json(
      {
        error: "Upgrade required to allow reshare",
        code: "ENTITLEMENT_REQUIRED",
      },
      { status: 403 },
    );
  }

  const updates: { shareShotHistory?: boolean; reshareEnabled?: boolean } = {};
  if (shareShotHistory !== undefined) updates.shareShotHistory = shareShotHistory;
  if (reshareEnabled !== undefined) updates.reshareEnabled = reshareEnabled;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(share);
  }

  const [updated] = await db
    .update(beansShare)
    .set(updates)
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    )
    .returning();

  return NextResponse.json(updated ?? share);
}

/**
 * DELETE /api/beans/:id/shares/:shareId — Revoke an individual share.
 * Bean creator or admin: revoke and optionally remove receiver's user_beans.
 * Receiver: may delete a pending share (decline).
 */
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; shareId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId, shareId } = await params;

  const [share] = await db
    .select()
    .from(beansShare)
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    )
    .limit(1);

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const isReceiver = share.userId === session.user.id;

  // Receiver may only delete (decline) when status is pending
  if (isReceiver) {
    if (share.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending invites can be declined" },
        { status: 403 },
      );
    }
    await db
      .delete(beansShare)
      .where(
        and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
      );
    return new NextResponse(null, { status: 204 });
  }

  const result = await canAccessBean(
    session.user.id,
    beanId,
    session.user.role,
  );
  if (!result.allowed) {
    return result.error;
  }

  const isCreatorOrAdmin =
    result.bean.createdBy === session.user.id ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  if (!isCreatorOrAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete: member retains read access to their own shots but loses sharing privileges
  await db
    .update(beansShare)
    .set({ unsharedAt: new Date() })
    .where(
      and(
        eq(beansShare.id, shareId),
        eq(beansShare.beanId, beanId),
        isNull(beansShare.unsharedAt),
      ),
    );

  return new NextResponse(null, { status: 204 });
}
