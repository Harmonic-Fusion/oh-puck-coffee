"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useSession } from "next-auth/react";
import { PhotoIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useUploadImage, useDeleteImage } from "@/components/shots/hooks";
import { resizeImageFileToJpegBlob } from "@/lib/image-resize";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AppRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { ShotPhotoStripLightbox } from "@/components/shots/ShotPhotoStripLightbox";

export interface PendingShotPhoto {
  id: string;
  thumbnailBase64: string;
  /** Full image URL for the lightbox (same as upload API `url`). */
  url: string;
}

interface ShotPhotoUploadProps {
  pendingPhotos: PendingShotPhoto[];
  onChange: (photos: PendingShotPhoto[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ShotPhotoUpload({
  pendingPhotos,
  onChange,
  disabled,
  className,
}: ShotPhotoUploadProps) {
  const { data: session } = useSession();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const deleteImage = useDeleteImage();
  const [error, setError] = useState<string | null>(null);

  // Use a ref so the dropzone onDrop callback always sees the latest count
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

  const isPro = hasEntitlement(
    session?.user?.entitlements,
    Entitlements.PHOTO_UPLOADS,
  );
  const maxPhotos = isPro ? 100 : 3;
  const atLimit = pendingPhotos.length >= maxPhotos;

  async function handleFile(file: File) {
    if (disabled) return;
    setError(null);

    const current = pendingPhotosRef.current;
    if (current.length >= maxPhotos) {
      if (!isPro) return; // upgrade prompt shown below
      setError(`You can add up to ${maxPhotos} photos for this shot.`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    try {
      const blob = await resizeImageFileToJpegBlob(file);
      const record = await upload.mutateAsync(blob);
      // Re-check limit after async upload in case user hit limit during upload
      if (pendingPhotosRef.current.length >= maxPhotos) {
        await deleteImage.mutateAsync(record.id);
        setError(`You can add up to ${maxPhotos} photos for this shot.`);
        return;
      }
      onChange([
        ...pendingPhotosRef.current,
        {
          id: record.id,
          thumbnailBase64: record.thumbnailBase64,
          url: `/api/images/${record.id}`,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload photo");
    }
  }

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) void handleFile(accepted[0]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, maxPhotos, isPro],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: disabled || upload.isPending || atLimit,
    noClick: true,
  });

  async function handleRemove(id: string) {
    setError(null);
    try {
      await deleteImage.mutateAsync(id);
    } catch {
      // Still drop from UI so the user can retry; orphan cleanup is best-effort
    }
    onChange(pendingPhotos.filter((p) => p.id !== id));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Photos
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {pendingPhotos.length}/{maxPhotos}
        </span>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          "border-stone-200 dark:border-stone-700",
          isDragActive &&
            !atLimit &&
            "border-stone-400 bg-stone-50 dark:border-stone-500 dark:bg-stone-800/50",
          !isDragActive &&
            !atLimit &&
            !disabled &&
            "hover:border-stone-300 hover:bg-stone-50/50 dark:hover:border-stone-600 dark:hover:bg-stone-800/20",
          (atLimit || disabled) && "cursor-default opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) void handleFile(e.target.files[0]);
            e.target.value = "";
          }}
        />

        {isDragActive && !atLimit ? (
          <>
            <PhotoIcon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Drop photo here
            </p>
          </>
        ) : (
          <>
            <PhotoIcon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Drag &amp; drop a photo, or
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || upload.isPending || atLimit}
                onClick={() => cameraInputRef.current?.click()}
              >
                <PhotoIcon className="h-4 w-4" />
                Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || upload.isPending || atLimit}
                onClick={open}
              >
                Browse
              </Button>
            </div>
          </>
        )}

        {upload.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 dark:bg-stone-900/80">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600 dark:border-stone-600 dark:border-t-stone-400" />
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Uploading…
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        </div>
      )}

      {!isPro && atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <SparklesIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Photo limit reached
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Free tier is limited to {maxPhotos} photos per shot.{" "}
                <Link
                  href={AppRoutes.settings.billing.path}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Upgrade to Pro
                </Link>{" "}
                for higher limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingPhotos.length > 0 && (
        <ShotPhotoStripLightbox
          title={null}
          items={pendingPhotos.map((p) => ({
            id: p.id,
            url: p.url,
            thumbnailBase64: p.thumbnailBase64,
          }))}
          thumbSize={80}
          renderThumbnailAccessory={(item) => (
            <button
              type="button"
              disabled={disabled || deleteImage.isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleRemove(item.id);
              }}
              className="absolute right-0.5 top-0.5 z-10 rounded bg-stone-900/75 px-1.5 py-0.5 text-xs text-white hover:bg-stone-900"
              aria-label="Remove photo"
            >
              ×
            </button>
          )}
        />
      )}
    </div>
  );
}
