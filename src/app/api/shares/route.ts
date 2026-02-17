import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shotShares, shots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateShortUid } from "@/lib/short-uid";
import { z } from "zod";

const createShareSchema = z.object({
  shotId: z.string().uuid(),
});

/**
 * POST /api/shares — Create a share link for a shot.
 * If one already exists for this shot+user, return the existing link.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createShareSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { shotId } = parsed.data;

  // Verify the shot exists and belongs to this user
  const [shot] = await db
    .select({ id: shots.id, userId: shots.userId })
    .from(shots)
    .where(eq(shots.id, shotId))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  if (shot.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if a share already exists for this shot
  const [existing] = await db
    .select()
    .from(shotShares)
    .where(
      and(
        eq(shotShares.shotId, shotId),
        eq(shotShares.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(existing);
  }

  // Create a new share with a short UID
  const uid = generateShortUid();

  const [share] = await db
    .insert(shotShares)
    .values({
      id: uid,
      shotId,
      userId: session.user.id,
    })
    .returning();

  return NextResponse.json(share, { status: 201 });
}
