import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { userBeans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
import { z } from "zod";

const bodySchema = z.object({ shareMyShotsPublicly: z.boolean() });

/**
 * PATCH /api/beans/:id/share-my-shots
 * Updates the current user's "share my shot history" preference for this bean.
 * Requires the user to have the bean in their collection (user_beans row).
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
    .update(userBeans)
    .set({ shareMyShotsPublicly: parsed.data.shareMyShotsPublicly })
    .where(
      and(
        eq(userBeans.beanId, beanId),
        eq(userBeans.userId, session.user.id),
      ),
    );

  const [updated] = await db
    .select()
    .from(userBeans)
    .where(
      and(
        eq(userBeans.beanId, beanId),
        eq(userBeans.userId, session.user.id),
      ),
    )
    .limit(1);

  return NextResponse.json(
    updated
      ? {
          beanId: updated.beanId,
          userId: updated.userId,
          openBagDate: updated.openBagDate,
          shareMyShotsPublicly: updated.shareMyShotsPublicly,
          createdAt: updated.createdAt,
        }
      : result.userBean,
  );
}
