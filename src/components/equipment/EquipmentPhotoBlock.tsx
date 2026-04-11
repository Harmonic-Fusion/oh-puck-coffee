"use client";

import { useRef } from "react";
import { resizeImageFileToJpegBlob } from "@/lib/image-resize";
/** List rows (grinder, machine, tool, …) expose the same image fields. */
export type EquipmentThumbSource = {
  id: string;
  thumbnailBase64?: string | null;
  imageUrl?: string | null;
};
import {
  USER_GEAR_EXTRA_TYPES,
  type UserGearExtraType,
  type UserGearType,
} from "@/shared/equipment/schema";
import {
  useUploadEquipmentImage,
  usePatchGrinder,
  usePatchMachine,
  usePatchExtraGearItem,
} from "./hooks";

const EXTRA_KIND_SET = new Set<string>(USER_GEAR_EXTRA_TYPES);

function isExtraGearKind(k: UserGearType): k is UserGearExtraType {
  return EXTRA_KIND_SET.has(k);
}

export function canEditEquipmentPhoto(opts: {
  userId: string | undefined;
  role: string | undefined;
  createdBy: string | null;
}): boolean {
  if (!opts.userId) return false;
  if (opts.role === "admin" || opts.role === "super-admin") return true;
  return opts.createdBy === opts.userId;
}

export function equipmentThumbSrc(
  item: Pick<EquipmentThumbSource, "thumbnailBase64" | "imageUrl">,
): string | undefined {
  if (item.thumbnailBase64) {
    return `data:image/png;base64,${item.thumbnailBase64}`;
  }
  if (item.imageUrl) {
    return item.imageUrl;
  }
  return undefined;
}

const photoFrameClassName =
  "relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800";

function EquipmentPhotoInner({ item }: { item: EquipmentThumbSource }) {
  const src = equipmentThumbSrc(item);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs and /api/images URLs
    <img src={src} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm text-stone-500 dark:text-stone-400">
      No photo
    </div>
  );
}

/** Read-only thumbnail for lists and cards; use {@link EquipmentPhotoBlock} where the user can replace or remove the image. */
export function EquipmentPhotoDisplay({ item }: { item: EquipmentThumbSource }) {
  return (
    <div className={photoFrameClassName}>
      <EquipmentPhotoInner item={item} />
    </div>
  );
}

export function EquipmentPhotoBlock({
  item,
  kind,
  canEditPhoto,
  onError,
}: {
  item: EquipmentThumbSource;
  kind: UserGearType;
  canEditPhoto: boolean;
  onError: (message: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadEquipmentImage();
  const patchGrinder = usePatchGrinder();
  const patchMachine = usePatchMachine();
  const patchExtra = usePatchExtraGearItem();
  const busy =
    upload.isPending ||
    patchGrinder.isPending ||
    patchMachine.isPending ||
    patchExtra.isPending;

  async function onPickFile(file: File) {
    onError(null);
    try {
      const blob = await resizeImageFileToJpegBlob(file);
      const record = await upload.mutateAsync(blob);
      if (kind === "grinder") {
        await patchGrinder.mutateAsync({
          grinderId: item.id,
          imageId: record.id,
        });
      } else if (kind === "machine") {
        await patchMachine.mutateAsync({
          machineId: item.id,
          imageId: record.id,
        });
      } else if (isExtraGearKind(kind)) {
        await patchExtra.mutateAsync({
          equipmentId: item.id,
          imageId: record.id,
        });
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not update photo");
    }
  }

  async function clearPhoto() {
    onError(null);
    try {
      if (kind === "grinder") {
        await patchGrinder.mutateAsync({ grinderId: item.id, imageId: null });
      } else if (kind === "machine") {
        await patchMachine.mutateAsync({ machineId: item.id, imageId: null });
      } else if (isExtraGearKind(kind)) {
        await patchExtra.mutateAsync({
          equipmentId: item.id,
          imageId: null,
        });
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove photo");
    }
  }

  const src = equipmentThumbSrc(item);
  const hasPhoto = Boolean(src);

  return (
    <div className={photoFrameClassName}>
      <EquipmentPhotoInner item={item} />
      {canEditPhoto && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-black/50 p-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (f) void onPickFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-white disabled:opacity-50"
          >
            {upload.isPending ? "…" : hasPhoto ? "Replace" : "Add photo"}
          </button>
          {hasPhoto && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearPhoto()}
              className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-white disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
