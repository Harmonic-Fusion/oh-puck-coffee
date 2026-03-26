/**
 * Client-side image resize before upload (see plan: max 1920px edge, JPEG ~80%).
 * Browser-only — call only from client components or event handlers.
 */

export const CLIENT_IMAGE_MAX_EDGE_PX = 1920;

export const CLIENT_JPEG_QUALITY = 0.82;

export async function resizeImageFileToJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const max = CLIENT_IMAGE_MAX_EDGE_PX;
  let w = width;
  let h = height;
  if (width > height && width > max) {
    h = Math.round((height * max) / width);
    w = max;
  } else if (height >= width && height > max) {
    w = Math.round((width * max) / height);
    h = max;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not available");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      CLIENT_JPEG_QUALITY,
    );
  });
}
