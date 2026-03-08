import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateShortUid } from "@/lib/short-uid";
import { z } from "zod";

const createShareSchema = z.object({
  shotId: z.string().min(1),
});

/**
 * POST /api/shares — Create a share link for a shot (sets shots.share_slug).
 * If the shot already has a shareSlug, return it.
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

  const [shot] = await db
    .select({ id: shots.id, userId: shots.userId, shareSlug: shots.shareSlug, createdAt: shots.createdAt })
    .from(shots)
    .where(and(eq(shots.id, shotId), eq(shots.userId, session.user.id)))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  if (shot.shareSlug) {
    return NextResponse.json({
      id: shot.shareSlug,
      shotId: shot.id,
      userId: session.user.id,
      createdAt: shot.createdAt,
    });
  }

  const uid = generateShortUid();
  await db
    .update(shots)
    .set({ shareSlug: uid, updatedAt: new Date() })
    .where(eq(shots.id, shotId));

  return NextResponse.json(
    {
      id: uid,
      shotId: shot.id,
      userId: session.user.id,
      createdAt: shot.createdAt,
    },
    { status: 201 }
  );
}
