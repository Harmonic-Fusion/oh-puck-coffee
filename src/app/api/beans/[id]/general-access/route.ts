import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canAccessBean, isBeanOwner, unshareSelfMembersOnRestricted } from "@/lib/beans-access";
import { updateGeneralAccessSchema } from "@/shared/beans/schema";
import { generateShortUid } from "@/lib/short-uid";
import { config } from "@/shared/config";

/**
 * PATCH /api/beans/:id/general-access — Update general access.
 * Owner-only. Generates shareSlug when non-restricted, clears when restricted. Enforces maxBeanShares.
 * When downgrading to restricted, unshares all self-status members.
 */
export async function PATCH(
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

  if (!isBeanOwner(result)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = updateGeneralAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { generalAccess } = parsed.data;
  const wasRestricted = result.bean.generalAccess === "restricted";

  if (
    generalAccess !== "restricted" &&
    (wasRestricted || !result.bean.shareSlug)
  ) {
    const individualShareCount = await db
      .select()
      .from(beansShare)
      .where(eq(beansShare.invitedBy, session.user.id));
    const directInviteCount = individualShareCount.filter(
      (r) => r.status !== "owner",
    ).length;
    if (directInviteCount >= config.maxBeanShares) {
      return NextResponse.json(
        {
          error: "Maximum bean share limit reached",
          code: "MAX_BEAN_SHARES",
        },
        { status: 403 },
      );
    }
  }

  if (generalAccess === "restricted" && !wasRestricted) {
    await unshareSelfMembersOnRestricted(beanId);
  }

  const updates: {
    generalAccess: "restricted" | "anyone_with_link" | "public";
    shareSlug: string | null;
    updatedAt: Date;
    updatedBy: string | null;
  } = {
    generalAccess,
    shareSlug:
      generalAccess === "restricted"
        ? null
        : result.bean.shareSlug ?? generateShortUid(),
    updatedAt: new Date(),
    updatedBy: session.user.id,
  };

  await db
    .update(beans)
    .set(updates)
    .where(eq(beans.id, beanId));

  const [updated] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, beanId))
    .limit(1);

  return NextResponse.json(updated ?? result.bean);
}
