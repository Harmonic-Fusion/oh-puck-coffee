import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/beans-access";
import { createBeansShareId } from "@/lib/nanoid-ids";

/**
 * POST /api/beans/:id/add-to-collection
 * Adds a bean to the current user's collection (creates beans_share row).
 * Allowed when the bean is public, anyone_with_link (user has access), or user received a share.
 * Requires authentication.
 */
export async function POST(
  _request: Request,
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
    session.user.role as "member" | "admin" | "super-admin",
  );

  if (!result.allowed) {
    return result.error;
  }

  const { bean, userBean } = result;

  if (userBean) {
    if (userBean.status === "pending") {
      const now = new Date();
      await db
        .update(beansShare)
        .set({
          status: "accepted",
          updatedAt: now,
        })
        .where(
          and(
            eq(beansShare.beanId, bean.id),
            eq(beansShare.userId, session.user.id),
          ),
        );
      return NextResponse.json(
        {
          message: "Already in your collection",
          bean: {
            id: bean.id,
            name: bean.name,
            originId: bean.originId,
            roasterId: bean.roasterId,
            roastLevel: bean.roastLevel,
            shareSlug: bean.shareSlug,
          },
        },
        { status: 200 },
      );
    }
    if (userBean.status === "unfollowed") {
      const now = new Date();
      await db
        .update(beansShare)
        .set({
          status: "self",
          invitedBy: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(beansShare.beanId, bean.id),
            eq(beansShare.userId, session.user.id),
          ),
        );
      return NextResponse.json(
        {
          message: "Added to your collection",
          bean: {
            id: bean.id,
            name: bean.name,
            originId: bean.originId,
            roasterId: bean.roasterId,
            roastLevel: bean.roastLevel,
            shareSlug: bean.shareSlug,
          },
        },
        { status: 201 },
      );
    }
    return NextResponse.json(
      { message: "Already in your collection", bean },
      { status: 200 },
    );
  }

  await db.insert(beansShare).values({
    id: createBeansShareId(),
    beanId: bean.id,
    userId: session.user.id,
    invitedBy: null,
    status: "self",
    shotHistoryAccess: "restricted",
    reshareAllowed: false,
    beansOpenDate: null,
  });

  return NextResponse.json(
    {
      message: "Added to your collection",
      bean: {
        id: bean.id,
        name: bean.name,
        originId: bean.originId,
        roasterId: bean.roasterId,
        roastLevel: bean.roastLevel,
        shareSlug: bean.shareSlug,
      },
    },
    { status: 201 },
  );
}
