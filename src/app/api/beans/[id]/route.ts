import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, origins, roasters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean, isBeanOwner } from "@/lib/beans-access";
import { resolveOriginId, resolveRoasterId } from "@/lib/beans-resolve-origin-roaster";
import { createBeanSchema } from "@/shared/beans/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const result = await canAccessBean(
    session.user.id,
    id,
    session.user.role,
  );

  if (!result.allowed) {
    return result.error;
  }

  const userBean = result.userBean
    ? {
        beanId: result.userBean.beanId,
        userId: result.userBean.userId,
        openBagDate: result.userBean.beansOpenDate,
        beansOpenDate: result.userBean.beansOpenDate,
        shotHistoryAccess: result.userBean.shotHistoryAccess,
        reshareAllowed: result.userBean.reshareAllowed,
        status: result.userBean.status,
        createdAt: result.userBean.createdAt,
      }
    : null;

  // Expose origin/roaster names for UI (beans table has only originId/roasterId)
  let originName: string | null = null;
  let roasterName: string | null = null;
  if (result.bean.originId || result.bean.roasterId) {
    const [originRow, roasterRow] = await Promise.all([
      result.bean.originId
        ? db.select({ name: origins.name }).from(origins).where(eq(origins.id, result.bean.originId!)).limit(1)
        : Promise.resolve([]),
      result.bean.roasterId
        ? db.select({ name: roasters.name }).from(roasters).where(eq(roasters.id, result.bean.roasterId!)).limit(1)
        : Promise.resolve([]),
    ]);
    originName = originRow[0]?.name ?? null;
    roasterName = roasterRow[0]?.name ?? null;
  }

  const body = {
    ...result.bean,
    origin: originName,
    roaster: roasterName,
    userBean,
  };
  return NextResponse.json(body);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const result = await canAccessBean(
    session.user.id,
    id,
    session.user.role,
  );

  if (!result.allowed) {
    return result.error;
  }

  const body = await request.json();
  const parsed = createBeanSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    openBagDate,
    origin: originName,
    roaster: roasterName,
    originId: _originId,
    roasterId: _roasterId,
    ...canonicalFields
  } = parsed.data;
  void _originId;
  void _roasterId;

  // Resolve origin/roaster names to IDs (find or create)
  const [resolvedOriginId, resolvedRoasterId] = await Promise.all([
    originName !== undefined ? resolveOriginId(originName) : Promise.resolve(undefined),
    roasterName !== undefined ? resolveRoasterId(roasterName) : Promise.resolve(undefined),
  ]);

  const updatePayload: Record<string, unknown> = { ...canonicalFields };
  if (originName !== undefined) updatePayload.originId = resolvedOriginId ?? null;
  if (roasterName !== undefined) updatePayload.roasterId = resolvedRoasterId ?? null;
  // Remove any keys that are not columns on beans (e.g. origin, roaster)
  delete (updatePayload as Record<string, unknown>).origin;
  delete (updatePayload as Record<string, unknown>).roaster;

  const isCreatorOrAdmin =
    isBeanOwner(result) ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  if (
    Object.keys(updatePayload).length > 0 &&
    !isCreatorOrAdmin
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (Object.keys(updatePayload).length > 0) {
    await db
      .update(beans)
      .set(updatePayload as Partial<typeof beans.$inferInsert>)
      .where(eq(beans.id, id));
  }

  if (openBagDate !== undefined && result.userBean) {
    await db
      .update(beansShare)
      .set({ beansOpenDate: openBagDate ?? null, updatedAt: new Date() })
      .where(
        and(
          eq(beansShare.beanId, id),
          eq(beansShare.userId, session.user.id),
        ),
      );
  }

  const [updatedBean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, id))
    .limit(1);

  if (!updatedBean) {
    return NextResponse.json({ error: "Bean not found" }, { status: 404 });
  }

  let userBeanRow = result.userBean;
  if (openBagDate !== undefined && result.userBean) {
    const [ub] = await db
      .select()
      .from(beansShare)
      .where(
        and(
          eq(beansShare.beanId, id),
          eq(beansShare.userId, session.user.id),
        ),
      )
      .limit(1);
    userBeanRow = ub ?? null;
  }

  const userBean = userBeanRow
    ? {
        beanId: userBeanRow.beanId,
        userId: userBeanRow.userId,
        openBagDate: userBeanRow.beansOpenDate,
        beansOpenDate: userBeanRow.beansOpenDate,
        shotHistoryAccess: userBeanRow.shotHistoryAccess,
        reshareAllowed: userBeanRow.reshareAllowed,
        status: userBeanRow.status,
        createdAt: userBeanRow.createdAt,
      }
    : null;

  // Expose origin/roaster names for UI
  let originNameRes: string | null = null;
  let roasterNameRes: string | null = null;
  if (updatedBean.originId || updatedBean.roasterId) {
    const [originRow, roasterRow] = await Promise.all([
      updatedBean.originId
        ? db.select({ name: origins.name }).from(origins).where(eq(origins.id, updatedBean.originId)).limit(1)
        : Promise.resolve([]),
      updatedBean.roasterId
        ? db.select({ name: roasters.name }).from(roasters).where(eq(roasters.id, updatedBean.roasterId)).limit(1)
        : Promise.resolve([]),
    ]);
    originNameRes = originRow[0]?.name ?? null;
    roasterNameRes = roasterRow[0]?.name ?? null;
  }

  return NextResponse.json({
    ...updatedBean,
    origin: originNameRes,
    roaster: roasterNameRes,
    userBean,
  });
}
