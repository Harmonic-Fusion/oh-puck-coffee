import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, userBeans, beansShare, shots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/api-auth";
import { z } from "zod";

const duplicateBeanSchema = z.object({
  includeShots: z.boolean().default(false),
});

/**
 * POST /api/beans/:id/duplicate — Duplicate a bean, creating a new owned copy.
 * Available to any user who can access the bean (including unshared members).
 * If includeShots=true, reassigns the caller's shots from the original to the new bean.
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

  const body: unknown = await request.json();
  const parsed = duplicateBeanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { includeShots } = parsed.data;
  const original = result.bean;

  // Create the new bean owned by the current user
  const [newBean] = await db
    .insert(beans)
    .values({
      name: original.name,
      origin: original.origin,
      roaster: original.roaster,
      originId: original.originId ?? undefined,
      roasterId: original.roasterId ?? undefined,
      originDetails: original.originDetails,
      processingMethod: original.processingMethod,
      roastLevel: original.roastLevel,
      roastDate: original.roastDate,
      isRoastDateBestGuess: original.isRoastDateBestGuess,
      createdBy: session.user.id,
      generalAccess: "restricted",
      generalAccessShareShots: false,
    })
    .returning();

  if (!newBean) {
    return NextResponse.json(
      { error: "Failed to create duplicate bean" },
      { status: 500 },
    );
  }

  // Get the original openBagDate from user_beans (original owner or current user)
  const [originalUserBean] = await db
    .select({ openBagDate: userBeans.openBagDate })
    .from(userBeans)
    .where(
      and(
        eq(userBeans.beanId, beanId),
        eq(userBeans.userId, session.user.id),
      ),
    )
    .limit(1);

  // Create user_beans row for the new bean
  await db.insert(userBeans).values({
    beanId: newBean.id,
    userId: session.user.id,
    openBagDate: originalUserBean?.openBagDate ?? undefined,
  });

  // Create owner beans_share row
  await db.insert(beansShare).values({
    beanId: newBean.id,
    userId: session.user.id,
    invitedBy: null,
    status: "accepted",
    shareShotHistory: false,
    reshareEnabled: true,
  });

  // Reassign shots to the new bean if requested
  if (includeShots) {
    await db
      .update(shots)
      .set({ beanId: newBean.id })
      .where(
        and(eq(shots.beanId, beanId), eq(shots.userId, session.user.id)),
      );
  }

  return NextResponse.json(newBean, { status: 201 });
}
