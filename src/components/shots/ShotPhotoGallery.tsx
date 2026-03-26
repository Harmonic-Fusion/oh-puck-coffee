"use client";

import { useShotImages, type ShotImageListItem } from "@/components/shots/hooks";
import { ShotPhotoStripLightbox } from "@/components/shots/ShotPhotoStripLightbox";

interface ShotPhotoGalleryProps {
  shotId: string;
  /** When 0, skip fetching (optional optimization). */
  imageCount?: number;
  /**
   * When set (e.g. public share page SSR), use these images and skip the authenticated list fetch.
   */
  images?: ShotImageListItem[];
}

export function ShotPhotoGallery({
  shotId,
  imageCount,
  images: imagesProp,
}: ShotPhotoGalleryProps) {
  const fromServer = imagesProp !== undefined;
  const shouldFetch =
    !fromServer && (imageCount === undefined ? true : imageCount > 0);

  const { data, isLoading, isError } = useShotImages(shotId, shouldFetch);

  const images = fromServer ? imagesProp : (data?.images ?? []);

  if (!fromServer && !shouldFetch) {
    return null;
  }

  if (!fromServer && isLoading && images.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading photos…</p>
      </div>
    );
  }

  if (!fromServer && isError) {
    return null;
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <ShotPhotoStripLightbox
      items={images.map((img) => ({
        id: img.id,
        url: `/api/images/${img.id}`,
        thumbnailBase64: img.thumbnailBase64,
      }))}
    />
  );
}
