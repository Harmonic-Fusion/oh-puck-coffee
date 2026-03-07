import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, userBeans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
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
        openBagDate: result.userBean.openBagDate,
        shareMyShotsPublicly: result.userBean.shareMyShotsPublicly,
        createdAt: result.userBean.createdAt,
      }
    : null;

  return NextResponse.json({
    ...result.bean,
    userBean,
  });
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

  const { openBagDate, ...canonicalFields } = parsed.data;

  const isCreatorOrAdmin =
    result.bean.createdBy === session.user.id ||
    session.user.role === "admin" ||
    session.user.role === "super-admin";

  if (
    Object.keys(canonicalFields).length > 0 &&
    !isCreatorOrAdmin
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (Object.keys(canonicalFields).length > 0) {
    await db
      .update(beans)
      .set(canonicalFields)
      .where(eq(beans.id, id));
  }

  if (openBagDate !== undefined && result.userBean) {
    await db
      .update(userBeans)
      .set({ openBagDate: openBagDate ?? null })
      .where(
        and(
          eq(userBeans.beanId, id),
          eq(userBeans.userId, session.user.id),
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
      .from(userBeans)
      .where(
        and(
          eq(userBeans.beanId, id),
          eq(userBeans.userId, session.user.id),
        ),
      )
      .limit(1);
    userBeanRow = ub ?? null;
  }

  const userBean = userBeanRow
    ? {
        beanId: userBeanRow.beanId,
        userId: userBeanRow.userId,
        openBagDate: userBeanRow.openBagDate,
        shareMyShotsPublicly: userBeanRow.shareMyShotsPublicly,
        createdAt: userBeanRow.createdAt,
      }
    : null;

  return NextResponse.json({
    ...updatedBean,
    userBean,
  });
}
