import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beansShare } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/beans/:id/shares/:shareId/accept — Accept a bean share (receiver only).
 * Sets status to accepted. Bean appears in receiver's list via their beans_share row.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId, shareId } = await params;

  const [share] = await db
    .select()
    .from(beansShare)
    .where(
      and(
        eq(beansShare.id, shareId),
        eq(beansShare.beanId, beanId),
        eq(beansShare.userId, session.user.id),
        eq(beansShare.status, "pending"),
      ),
    )
    .limit(1);

  if (!share) {
    return NextResponse.json(
      { error: "Share not found or already accepted" },
      { status: 404 },
    );
  }

  const [updated] = await db
    .update(beansShare)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Failed to accept share" },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}
