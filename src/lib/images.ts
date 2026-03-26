import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { eq, sum, count, asc } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { images, shotImages } from "@/db/schema";
import { config } from "@/shared/config";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";

/** Safety net after client-side resize (spec: max 5 MB). */
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const THUMBNAIL_MAX_EDGE_PX = 200;

/** Paid tier defaults when `photo-uploads` is present (not env-driven yet). */
const PAID_MAX_PHOTOS_PER_SHOT = 100;
const PAID_MAX_TOTAL_IMAGE_BYTES = 1024 * 1024 * 1024;

let r2Client: S3Client | null = null;

export function isR2UploadConfigured(): boolean {
  return config.cloudflareR2UploadReady;
}

function getR2S3Client(): S3Client {
  if (!config.cloudflareR2UploadReady) {
    throw new Error("Cloudflare R2 is not configured for uploads");
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.cloudflareR2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.cloudflareR2AccessKeyId!,
        secretAccessKey: config.cloudflareR2SecretAccessKey!,
      },
      forcePathStyle: true,
    });
  }
  return r2Client;
}

export function buildImageObjectKey(imageId: string): string {
  return `images/${imageId}`;
}

export function publicUrlForImageObject(imageId: string): string {
  const base = config.cloudflareR2PublicUrl;
  if (!base) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL (or account + bucket) is required");
  }
  return `${base.replace(/\/+$/, "")}/images/${imageId}`;
}

export async function uploadImageObjectToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const client = getR2S3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.cloudflareR2BucketName!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}

export async function deleteImageObjectFromR2(key: string): Promise<void> {
  const client = getR2S3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.cloudflareR2BucketName!,
      Key: key,
    }),
  );
}

export async function fetchImageFromR2(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const client = getR2S3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.cloudflareR2BucketName!,
      Key: key,
    }),
  );
  if (!response.Body) {
    throw new Error("Empty response body from R2");
  }
  const bytes = await response.Body.transformToByteArray();
  return { bytes, contentType: response.ContentType ?? "application/octet-stream" };
}

export async function generatePngThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize(THUMBNAIL_MAX_EDGE_PX, THUMBNAIL_MAX_EDGE_PX, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

export function getImageLimits(entitlements: string[] | undefined): {
  maxPhotosPerShot: number;
  maxTotalStorageBytes: number;
} {
  const paid = hasEntitlement(entitlements, Entitlements.PHOTO_UPLOADS);
  if (paid) {
    return {
      maxPhotosPerShot: PAID_MAX_PHOTOS_PER_SHOT,
      maxTotalStorageBytes: PAID_MAX_TOTAL_IMAGE_BYTES,
    };
  }
  return {
    maxPhotosPerShot: config.maxPhotosPerShot,
    maxTotalStorageBytes: config.maxImageStorageBytes,
  };
}

export async function getUserImageStorageBytesUsed(
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: sum(images.sizeBytes) })
    .from(images)
    .where(eq(images.userId, userId));
  const total = row?.total;
  if (total == null) return 0;
  return typeof total === "bigint" ? Number(total) : Number(total);
}

export async function countImagesOnShot(shotId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(shotImages)
    .where(eq(shotImages.shotId, shotId));
  return Number(row?.c ?? 0);
}

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime);
}

export function thumbnailBufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

export async function listImagesForShot(shotId: string) {
  return db
    .select({
      id: images.id,
      url: images.url,
      thumbnail: images.thumbnail,
      sizeBytes: images.sizeBytes,
      attachedAt: shotImages.createdAt,
      createdAt: images.createdAt,
    })
    .from(shotImages)
    .innerJoin(images, eq(shotImages.imageId, images.id))
    .where(eq(shotImages.shotId, shotId))
    .orderBy(asc(shotImages.createdAt));
}
