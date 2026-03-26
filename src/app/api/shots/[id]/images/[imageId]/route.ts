import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { shotImages, shots } from "@/db/schema";
import {
  requireAuth,
  validateMemberAccess,
} from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: shotId, imageId } = await params;

  const [shot] = await db
    .select({ id: shots.id, userId: shots.userId })
    .from(shots)
    .where(eq(shots.id, shotId))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  const forbidden = validateMemberAccess(
    session!.user.id,
    shot.userId,
    session!.user.role,
  );
  if (forbidden) return forbidden;

  const removed = await db
    .delete(shotImages)
    .where(
      and(
        eq(shotImages.shotId, shotId),
        eq(shotImages.imageId, imageId),
      ),
    )
    .returning({ shotId: shotImages.shotId });

  if (removed.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
