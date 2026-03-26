import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { images } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  buildImageObjectKey,
  deleteImageObjectFromR2,
  generatePngThumbnail,
  getImageLimits,
  getUserImageStorageBytesUsed,
  isAllowedImageMime,
  isR2UploadConfigured,
  publicUrlForImageObject,
  thumbnailBufferToBase64,
  uploadImageObjectToR2,
} from "@/lib/images";
import { createImageId } from "@/lib/nanoid-ids";
import { imageUploadFormField } from "@/shared/images/schema";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!isR2UploadConfigured()) {
    return NextResponse.json(
      { error: "Image uploads are not configured" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get(imageUploadFormField);
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: `Missing file field "${imageUploadFormField}"` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image must be at most ${MAX_IMAGE_UPLOAD_BYTES} bytes` },
      { status: 413 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!isAllowedImageMime(mime)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are allowed" },
      { status: 400 },
    );
  }

  const limits = getImageLimits(session!.user.entitlements);
  const used = await getUserImageStorageBytesUsed(session!.user.id);
  if (used + buffer.length > limits.maxTotalStorageBytes) {
    return NextResponse.json(
      { error: "Storage quota exceeded" },
      { status: 403 },
    );
  }

  const id = createImageId();
  const key = buildImageObjectKey(id);
  let thumbnail: Buffer;
  try {
    thumbnail = await generatePngThumbnail(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid image data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await uploadImageObjectToR2({
      key,
      body: buffer,
      contentType: mime,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload image to storage" },
      { status: 502 },
    );
  }

  const url = publicUrlForImageObject(id);

  try {
    const [inserted] = await db
      .insert(images)
      .values({
        id,
        url,
        thumbnail,
        sizeBytes: buffer.length,
        userId: session!.user.id,
      })
      .returning({
        id: images.id,
        url: images.url,
        thumbnail: images.thumbnail,
        sizeBytes: images.sizeBytes,
        createdAt: images.createdAt,
      });

    if (!inserted) {
      throw new Error("Insert returned no row");
    }

    return NextResponse.json({
      id: inserted.id,
      url: inserted.url,
      thumbnailBase64: thumbnailBufferToBase64(inserted.thumbnail),
      sizeBytes: inserted.sizeBytes,
      createdAt: inserted.createdAt.toISOString(),
    });
  } catch {
    try {
      await deleteImageObjectFromR2(key);
    } catch {
      // best-effort rollback
    }
    return NextResponse.json(
      { error: "Failed to save image metadata" },
      { status: 500 },
    );
  }
}
