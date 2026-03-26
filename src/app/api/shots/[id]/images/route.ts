import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { images, shotImages, shots } from "@/db/schema";
import {
  requireAuth,
  validateMemberAccess,
} from "@/lib/api-auth";
import {
  countImagesOnShot,
  getImageLimits,
  isR2UploadConfigured,
  listImagesForShot,
  thumbnailBufferToBase64,
} from "@/lib/images";
import { attachImageToShotBodySchema } from "@/shared/images/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: shotId } = await params;

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

  const rows = await listImagesForShot(shotId);

  return NextResponse.json({
    images: rows.map((r) => ({
      id: r.id,
      url: `/api/images/${r.id}`,
      thumbnailBase64: thumbnailBufferToBase64(r.thumbnail),
      sizeBytes: r.sizeBytes,
      attachedAt: r.attachedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!isR2UploadConfigured()) {
    return NextResponse.json(
      { error: "Image uploads are not configured" },
      { status: 503 },
    );
  }

  const { id: shotId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = attachImageToShotBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { imageId } = parsed.data;

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

  const [image] = await db
    .select({
      id: images.id,
      userId: images.userId,
    })
    .from(images)
    .where(eq(images.id, imageId))
    .limit(1);

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (image.userId !== shot.userId) {
    return NextResponse.json(
      { error: "Image does not belong to this shot's owner" },
      { status: 403 },
    );
  }

  const limits = getImageLimits(session!.user.entitlements);
  const onShot = await countImagesOnShot(shotId);
  if (onShot >= limits.maxPhotosPerShot) {
    return NextResponse.json(
      { error: "Photo limit reached for this shot" },
      { status: 403 },
    );
  }

  const [existing] = await db
    .select({ shotId: shotImages.shotId })
    .from(shotImages)
    .where(
      and(
        eq(shotImages.shotId, shotId),
        eq(shotImages.imageId, imageId),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Image is already attached to this shot" },
      { status: 409 },
    );
  }

  await db.insert(shotImages).values({
    shotId,
    imageId,
  });

  return NextResponse.json({ ok: true });
}
