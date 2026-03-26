import * as z from "zod";

/** Multipart field name for uploaded image bytes. */
export const imageUploadFormField = "file";

export const attachImageToShotBodySchema = z.object({
  imageId: z.string().min(1),
});

export type AttachImageToShotBody = z.infer<typeof attachImageToShotBodySchema>;

export const imageRecordSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  thumbnailBase64: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;

export const shotImageListItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  thumbnailBase64: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  attachedAt: z.string(),
  createdAt: z.string(),
});

export type ShotImageListItem = z.infer<typeof shotImageListItemSchema>;
