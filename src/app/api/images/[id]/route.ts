import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { images, shotImages, shots } from "@/db/schema";
import {
  requireAuth,
  validateMemberAccess,
} from "@/lib/api-auth";
import {
  buildImageObjectKey,
  deleteImageObjectFromR2,
  fetchImageFromR2,
  isR2UploadConfigured,
} from "@/lib/images";
import { getSession } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isR2UploadConfigured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const { id } = await params;

  const [row] = await db
    .select({ id: images.id, userId: images.userId })
    .from(images)
    .where(eq(images.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();

  if (session?.user) {
    const forbidden = validateMemberAccess(session.user.id, row.userId, session.user.role);
    if (forbidden) return forbidden;
  } else {
    // Unauthenticated: only allow if image is on a publicly shared shot
    const [shared] = await db
      .select({ shotId: shotImages.shotId })
      .from(shotImages)
      .innerJoin(shots, eq(shotImages.shotId, shots.id))
      .where(and(eq(shotImages.imageId, id), isNotNull(shots.shareSlug)))
      .limit(1);

    if (!shared) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { bytes, contentType } = await fetchImageFromR2(buildImageObjectKey(id));
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const [row] = await db
    .select({
      id: images.id,
      userId: images.userId,
    })
    .from(images)
    .where(eq(images.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const forbidden = validateMemberAccess(
    session!.user.id,
    row.userId,
    session!.user.role,
  );
  if (forbidden) return forbidden;

  if (isR2UploadConfigured()) {
    const key = buildImageObjectKey(id);
    try {
      await deleteImageObjectFromR2(key);
    } catch {
      return NextResponse.json(
        { error: "Failed to delete image from storage" },
        { status: 502 },
      );
    }
  }

  await db.delete(images).where(eq(images.id, id));

  return NextResponse.json({ ok: true });
}
