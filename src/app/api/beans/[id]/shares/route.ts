import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare, users } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { canAccessBean, isBeanOwner } from "@/lib/beans-access";
import { createBeansShareId } from "@/lib/nanoid-ids";
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
    isBeanOwner(result) ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  // Ensure the bean has an owner row (backfill for pre-migration data)
  const [ownerRow] = await db
    .select()
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, beanId),
        eq(beansShare.status, "owner"),
      ),
    )
    .limit(1);

  if (!ownerRow) {
    return NextResponse.json(
      { error: "Bean has no owner row" },
      { status: 500 },
    );
  }

  const members = await db
    .select({
      id: beansShare.id,
      beanId: beansShare.beanId,
      userId: beansShare.userId,
      invitedBy: beansShare.invitedBy,
      status: beansShare.status,
      shotHistoryAccess: beansShare.shotHistoryAccess,
      reshareAllowed: beansShare.reshareAllowed,
      beansOpenDate: beansShare.beansOpenDate,
      createdAt: beansShare.createdAt,
      updatedAt: beansShare.updatedAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(beansShare)
    .innerJoin(users, eq(beansShare.userId, users.id))
    .where(
      and(eq(beansShare.beanId, beanId), ne(beansShare.status, "unfollowed")),
    );

  return NextResponse.json({
    members,
    createdBy: ownerRow.userId,
    generalAccess: result.bean.generalAccess,
    shareSlug: result.bean.shareSlug,
    isOwner: isCreatorOrAdmin,
  });
}

/**
 * POST /api/beans/:id/shares — Create an individual share.
 * Requires creator or reshare permission. Enforces bean-share entitlement for reshareAllowed and maxBeanShares.
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

  const isCreator = isBeanOwner(result);
  const isAdmin =
    session.user.role === "admin" || session.user.role === "super-admin";

  let canShare = isCreator || isAdmin;
  if (!canShare) {
    const [myMembership] = await db
        .select({ reshareAllowed: beansShare.reshareAllowed })
        .from(beansShare)
        .where(
          and(
            eq(beansShare.beanId, beanId),
            eq(beansShare.userId, session.user.id),
            inArray(beansShare.status, ["accepted", "self"]),
          ),
        )
        .limit(1);
    canShare = myMembership?.reshareAllowed === true;
  }

  if (!canShare) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasEntitlement(session.user.entitlements, Entitlements.BEANS_SHARE)) {
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

  const { userId: inviteeUserId, reshareAllowed } = parsed.data;

  if (inviteeUserId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot share a bean with yourself" },
      { status: 400 },
    );
  }

  if (
    reshareAllowed &&
    !hasEntitlement(session.user.entitlements, Entitlements.BEANS_SHARE)
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
    .where(
      and(
        eq(beansShare.invitedBy, session.user.id),
        ne(beansShare.status, "owner"),
      ),
    );
  if (individualShareCount.length >= config.maxBeanShares) {
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
    if (existing.status === "unfollowed") {
      const now = new Date();
      const [updated] = await db
        .update(beansShare)
        .set({
          status: "accepted",
          invitedBy: session.user.id,
          updatedAt: now,
        })
        .where(
          and(eq(beansShare.beanId, beanId), eq(beansShare.userId, inviteeUserId)),
        )
        .returning();
      return NextResponse.json(updated ?? existing, { status: 200 });
    }
    return NextResponse.json(existing, { status: 200 });
  }

  const [share] = await db
    .insert(beansShare)
    .values({
      id: createBeansShareId(),
      beanId,
      userId: inviteeUserId,
      invitedBy: session.user.id,
      status: "pending",
      shotHistoryAccess: "restricted",
      reshareAllowed: reshareAllowed ?? false,
    })
    .returning();

  if (!share) {
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 },
    );
  }

  // Receiver gets beans_share row only after they accept the share (see accept-share endpoint)
  return NextResponse.json(share, { status: 201 });
}
