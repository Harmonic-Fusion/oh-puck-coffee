import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { userBeans } from "@/db/schema";
import { canAccessBean } from "@/lib/api-auth";

/**
 * POST /api/beans/:id/add-to-collection
 * Adds a bean to the current user's collection (creates user_beans row).
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
    return NextResponse.json(
      { message: "Already in your collection", bean },
      { status: 200 },
    );
  }

  const [inserted] = await db
    .insert(userBeans)
    .values({
      beanId: bean.id,
      userId: session.user.id,
      openBagDate: null,
    })
    .returning();

  if (!inserted) {
    return NextResponse.json(
      { error: "Failed to add to collection" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message: "Added to your collection",
      bean: {
        id: bean.id,
        name: bean.name,
        origin: bean.origin,
        roaster: bean.roaster,
        roastLevel: bean.roastLevel,
        shareSlug: bean.shareSlug,
      },
    },
    { status: 201 },
  );
}
