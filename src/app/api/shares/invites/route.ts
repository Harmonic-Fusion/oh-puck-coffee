import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/shares/invites — List pending bean shares for the current user (receiver).
 * Used so User B can see "X shared a bean with you" and accept or decline.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await db
    .select({
      id: beansShare.id,
      beanId: beansShare.beanId,
      invitedBy: beansShare.invitedBy,
      shareShotHistory: beansShare.shareShotHistory,
      reshareEnabled: beansShare.reshareEnabled,
      createdAt: beansShare.createdAt,
      beanName: beans.name,
      beanRoaster: beans.roaster,
      beanOrigin: beans.origin,
      sharerName: users.name,
      sharerImage: users.image,
    })
    .from(beansShare)
    .innerJoin(beans, eq(beansShare.beanId, beans.id))
    .leftJoin(users, eq(beansShare.invitedBy, users.id))
    .where(
      and(
        eq(beansShare.userId, session.user.id),
        eq(beansShare.status, "pending"),
      ),
    )
    .orderBy(desc(beansShare.createdAt));

  return NextResponse.json(pending);
}
