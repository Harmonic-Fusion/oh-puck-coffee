import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean, isBeanOwner, deleteMemberAndDescendants } from "@/lib/beans-access";
import { updateBeanShareSchema } from "@/shared/beans/schema";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";

/**
 * PATCH /api/beans/:id/shares/:shareId — Update a person's access (shotHistoryAccess, reshareAllowed).
 * Only bean owner or admin can update.
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
    isBeanOwner(result) ||
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

  // Owner/admin can update any field. Members can only update their own shotHistoryAccess.
  if (!isCreatorOrAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shotHistoryAccess, reshareAllowed } = parsed.data;

  // Only the bean owner can set reshareAllowed (not admins)
  if (reshareAllowed !== undefined && !isBeanOwner(result)) {
    return NextResponse.json(
      { error: "Only the owner can change reshare permission" },
      { status: 403 },
    );
  }

  if (
    reshareAllowed === true &&
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

  const updates: {
    shotHistoryAccess?: "none" | "restricted" | "anyone_with_link";
    reshareAllowed?: boolean;
    updatedAt?: Date;
  } = {};
  if (shotHistoryAccess !== undefined) updates.shotHistoryAccess = shotHistoryAccess;
  if (reshareAllowed !== undefined) updates.reshareAllowed = reshareAllowed;
  if (Object.keys(updates).length > 0) updates.updatedAt = new Date();

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
 * Bean owner or admin: recursively unshare member and all descendants. Receiver: may delete a pending share (decline).
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

  // Receiver: pending = decline (delete); accepted/self = unfollow (set status unfollowed, repoint descendants)
  if (isReceiver) {
    if (share.status === "pending") {
      await db
        .delete(beansShare)
        .where(
          and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
        );
      return new NextResponse(null, { status: 204 });
    }
    if (share.status === "accepted" || share.status === "self") {
      const [ownerRow] = await db
        .select({ userId: beansShare.userId })
        .from(beansShare)
        .where(
          and(
            eq(beansShare.beanId, beanId),
            eq(beansShare.status, "owner"),
          ),
        )
        .limit(1);
      const ownerId = ownerRow?.userId ?? null;
      if (ownerId) {
        await db
          .update(beansShare)
          .set({
            invitedBy: ownerId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(beansShare.beanId, beanId),
              eq(beansShare.invitedBy, session.user.id),
            ),
          );
      }
      await db
        .update(beansShare)
        .set({
          status: "unfollowed",
          updatedAt: new Date(),
        })
        .where(
          and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
        );
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(
      { error: "Only pending invites can be declined" },
      { status: 403 },
    );
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
    isBeanOwner(result) ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  if (!isCreatorOrAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteMemberAndDescendants(beanId, shareId);

  return new NextResponse(null, { status: 204 });
}
