import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
import { updateGeneralAccessSchema } from "@/shared/beans/schema";
import { generateShortUid } from "@/lib/short-uid";
import { config } from "@/shared/config";

/**
 * PATCH /api/beans/:id/general-access — Update general access and shot history toggle.
 * Creator-only. Generates shareSlug when non-restricted, clears when restricted. Enforces maxBeanShares.
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

  if (result.bean.createdBy !== session.user.id) {
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

  const { generalAccess, generalAccessShareShots } = parsed.data;

  if (
    generalAccess !== "restricted" &&
    (result.bean.generalAccess === "restricted" || !result.bean.shareSlug)
  ) {
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
    const totalShares =
      individualShareCount.length + withGeneralAccess.length;
    if (totalShares >= config.maxBeanShares) {
      return NextResponse.json(
        {
          error: "Maximum bean share limit reached",
          code: "MAX_BEAN_SHARES",
        },
        { status: 403 },
      );
    }
  }

  const updates: {
    generalAccess: "restricted" | "anyone_with_link" | "public";
    generalAccessShareShots?: boolean;
    shareSlug: string | null;
  } = {
    generalAccess,
    shareSlug:
      generalAccess === "restricted"
        ? null
        : result.bean.shareSlug ?? generateShortUid(),
  };

  if (generalAccessShareShots !== undefined) {
    updates.generalAccessShareShots = generalAccessShareShots;
  }

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
