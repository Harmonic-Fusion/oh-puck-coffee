import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, shots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/beans-access";
import { z } from "zod";

/** Generate a unique id with prefix (avoids importing nanoid-ids so tests can run without nanoid resolve). */
function prefixedId(prefix: string): string {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 21)}`;
}

const duplicateBeanSchema = z.object({
  shotOption: z
    .enum(["duplicate", "migrate", "none"])
    .default("duplicate"),
});

/**
 * POST /api/beans/:id/duplicate — Duplicate a bean, creating a new owned copy.
 * Available to any user who can access the bean (including unshared members).
 * shotOption: 'duplicate' = copy user's shots to new bean; 'migrate' = move user's shots; 'none' = no shots.
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

  const { shotOption } = parsed.data;
  const original = result.bean;

  // Create the new bean owned by the current user
  const [newBean] = await db
    .insert(beans)
    .values({
      id: prefixedId("b_"),
      name: `${original.name} (copy)`,
      originId: original.originId ?? undefined,
      roasterId: original.roasterId ?? undefined,
      originDetails: original.originDetails,
      processingMethod: original.processingMethod,
      roastLevel: original.roastLevel,
      roastDate: original.roastDate,
      isRoastDateBestGuess: original.isRoastDateBestGuess,
      generalAccess: "restricted",
    })
    .returning();

  if (!newBean) {
    return NextResponse.json(
      { error: "Failed to create duplicate bean" },
      { status: 500 },
    );
  }

  const beansOpenDate = result.userBean?.beansOpenDate ?? null;

  await db.insert(beansShare).values({
    id: prefixedId("b2u_"),
    beanId: newBean.id,
    userId: session.user.id,
    invitedBy: null,
    status: "owner",
    shotHistoryAccess: "restricted",
    reshareAllowed: true,
    beansOpenDate,
  });

  if (shotOption === "migrate") {
    await db
      .update(shots)
      .set({ beanId: newBean.id, updatedAt: new Date() })
      .where(
        and(eq(shots.beanId, beanId), eq(shots.userId, session.user.id)),
      );
  } else if (shotOption === "duplicate") {
    const myShots = await db
      .select()
      .from(shots)
      .where(
        and(eq(shots.beanId, beanId), eq(shots.userId, session.user.id)),
      );
    const now = new Date();
    for (const shot of myShots) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit id, beanId, shareSlug, createdAt, updatedAt from rest
      const { id, beanId, shareSlug, createdAt, updatedAt, ...rest } = shot;
      await db.insert(shots).values({
        id: prefixedId("s_"),
        ...rest,
        beanId: newBean.id,
        userId: session.user.id,
        shareSlug: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  // shotOption === "none": skip

  return NextResponse.json(newBean, { status: 201 });
}
