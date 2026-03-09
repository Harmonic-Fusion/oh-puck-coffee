import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/beans-access";
import { z } from "zod";

const bodySchema = z.object({
  shotHistoryAccess: z.enum(["none", "restricted", "anyone_with_link"]),
});

/**
 * PATCH /api/beans/:id/share-my-shots
 * Updates the current user's shot history visibility for this bean (beans_share.shot_history_access).
 * Requires the user to have a beans_share row (member) for this bean.
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
    session.user.role as "member" | "admin" | "super-admin",
  );

  if (!result.allowed) {
    return result.error;
  }

  if (!result.userBean) {
    return NextResponse.json(
      { error: "Bean must be in your collection to update this setting" },
      { status: 403 },
    );
  }

  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await db
    .update(beansShare)
    .set({
      shotHistoryAccess: parsed.data.shotHistoryAccess,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(beansShare.beanId, beanId),
        eq(beansShare.userId, session.user.id),
      ),
    );

  const [updated] = await db
    .select()
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, beanId),
        eq(beansShare.userId, session.user.id),
      ),
    )
    .limit(1);

  return NextResponse.json(
    updated
      ? {
          beanId: updated.beanId,
          userId: updated.userId,
          openBagDate: updated.beansOpenDate,
          beansOpenDate: updated.beansOpenDate,
          shotHistoryAccess: updated.shotHistoryAccess,
          reshareAllowed: updated.reshareAllowed,
          createdAt: updated.createdAt,
        }
      : result.userBean,
  );
}
