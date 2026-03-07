import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
import { createBeanShareSchema } from "@/shared/beans/schema";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";
import { config } from "@/shared/config";

/**
 * GET /api/beans/:id/shares — List individual shares and general access for a bean.
 * Bean creator/admin sees full data with edit permissions.
 * Any other user with bean access (e.g. a recipient) sees a read-only view:
 * general access settings + shares list, with isOwner: false.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId } = await params;

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

  // Ensure the bean owner always has a row in beans_share (backfill for pre-migration beans)
  if (result.bean.createdBy) {
    await db
      .insert(beansShare)
      .values({
        beanId,
        userId: result.bean.createdBy,
        invitedBy: null,
        status: "accepted",
        shareShotHistory: false,
        reshareEnabled: true,
      })
      .onConflictDoNothing();
  }

  const members = await db
    .select({
      id: beansShare.id,
      beanId: beansShare.beanId,
      userId: beansShare.userId,
      invitedBy: beansShare.invitedBy,
      status: beansShare.status,
      shareShotHistory: beansShare.shareShotHistory,
      reshareEnabled: beansShare.reshareEnabled,
      createdAt: beansShare.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(beansShare)
    .innerJoin(users, eq(beansShare.userId, users.id))
    .where(eq(beansShare.beanId, beanId));

  return NextResponse.json({
    members,
    createdBy: result.bean.createdBy,
    generalAccess: result.bean.generalAccess,
    generalAccessShareShots: result.bean.generalAccessShareShots,
    shareSlug: result.bean.shareSlug,
    isOwner: isCreatorOrAdmin,
  });
}

/**
 * POST /api/beans/:id/shares — Create an individual share.
 * Requires creator or reshare permission. Enforces bean-share entitlement for reshareEnabled and maxBeanShares.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId } = await params;

  const result = await canAccessBean(
    session.user.id,
    beanId,
    session.user.role,
  );

  if (!result.allowed) {
    return result.error;
  }

  const isCreator = result.bean.createdBy === session.user.id;
  const isAdmin =
    session.user.role === "admin" || session.user.role === "super-admin";

  let canShare = isCreator || isAdmin;
  if (!canShare) {
    // Check if user's membership grants reshare, or bean is public (anyone can reshare public beans)
    if (result.bean.generalAccess === "public") {
      canShare = true;
    } else {
      const [myMembership] = await db
        .select({ reshareEnabled: beansShare.reshareEnabled })
        .from(beansShare)
        .where(
          and(
            eq(beansShare.beanId, beanId),
            eq(beansShare.userId, session.user.id),
            eq(beansShare.status, "accepted"),
            isNull(beansShare.unsharedAt),
          ),
        )
        .limit(1);
      canShare = myMembership?.reshareEnabled === true;
    }
  }

  if (!canShare) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasEntitlement(session.user.entitlements, Entitlements.BEAN_SHARE)) {
    return NextResponse.json(
      {
        error: "Upgrade required to share with others",
        code: "ENTITLEMENT_REQUIRED",
      },
      { status: 403 },
    );
  }

  const body: unknown = await request.json();
  const parsed = createBeanShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId: inviteeUserId, reshareEnabled } = parsed.data;

  if (inviteeUserId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot share a bean with yourself" },
      { status: 400 },
    );
  }

  if (
    reshareEnabled &&
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

  const individualShareCount = await db
    .select()
    .from(beansShare)
    .where(eq(beansShare.invitedBy, session.user.id));
  const allMyBeans = await db
    .select({ id: beans.id, generalAccess: beans.generalAccess })
    .from(beans)
    .where(eq(beans.createdBy, session.user.id));
  const withGeneralAccess = allMyBeans.filter(
    (b) => b.generalAccess !== "restricted",
  );
  const totalShares = individualShareCount.length + withGeneralAccess.length;
  if (totalShares >= config.maxBeanShares) {
    return NextResponse.json(
      {
        error: "Maximum bean share limit reached",
        code: "MAX_BEAN_SHARES",
      },
      { status: 403 },
    );
  }

  const [existing] = await db
    .select()
    .from(beansShare)
    .where(
      and(eq(beansShare.beanId, beanId), eq(beansShare.userId, inviteeUserId)),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const [share] = await db
    .insert(beansShare)
    .values({
      beanId,
      userId: inviteeUserId,
      invitedBy: session.user.id,
      status: "pending",
      shareShotHistory: false,
      reshareEnabled,
    })
    .returning();

  if (!share) {
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 },
    );
  }

  // Receiver gets user_beans row only after they accept the share (see accept-share endpoint)
  return NextResponse.json(share, { status: 201 });
}
