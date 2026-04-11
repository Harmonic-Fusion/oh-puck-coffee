"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  EquipmentSpecsEditor,
  normalizeSpecsForPayload,
  type EquipmentSpecsEditorHandle,
} from "@/components/admin/equipment/EquipmentSpecsEditor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canEditEquipmentMetadata } from "@/lib/equipment-authorization";
import type { Grinder } from "@/shared/equipment/schema";
import {
  USER_GEAR_EXTRA_TYPES,
  type EquipmentType,
  type UserGearExtraType,
  type UserGearType,
} from "@/shared/equipment/schema";
import {
  usePatchExtraGearItem,
  usePatchGrinder,
  usePatchMachine,
} from "./hooks";
import {
  EquipmentPhotoBlock,
  EquipmentPhotoDisplay,
  canEditEquipmentPhoto,
} from "./EquipmentPhotoBlock";

const EXTRA_KIND_SET = new Set<string>(USER_GEAR_EXTRA_TYPES);

function isExtraGearKind(k: UserGearType): k is UserGearExtraType {
  return EXTRA_KIND_SET.has(k);
}

function userGearKindToEquipmentType(kind: UserGearType): EquipmentType {
  return kind as EquipmentType;
}

type EditTarget = {
  kind: UserGearType;
  item: Grinder;
};

export function GearMetadataEditDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EditTarget | null;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const patchGrinder = usePatchGrinder();
  const patchMachine = usePatchMachine();
  const patchExtra = usePatchExtraGearItem();
  const editorRef = useRef<EquipmentSpecsEditorHandle>(null);

  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [specsDraft, setSpecsDraft] = useState<Record<string, unknown>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [prevEditSyncKey, setPrevEditSyncKey] = useState<string | null>(null);

  const item = target?.item ?? null;
  const kind = target?.kind;

  if (!open) {
    if (prevEditSyncKey !== null) {
      setPrevEditSyncKey(null);
    }
  } else if (item && kind) {
    const editSyncKey = `${item.id}:${kind}`;
    if (editSyncKey !== prevEditSyncKey) {
      setPrevEditSyncKey(editSyncKey);
      setEditName(item.name);
      setEditBrand(item.brand?.trim() ?? "");
      setSpecsDraft(
        item.specs && typeof item.specs === "object" && !Array.isArray(item.specs)
          ? { ...item.specs }
          : {},
      );
      setLocalError(null);
      setPhotoError(null);
    }
  }

  const canEdit =
    Boolean(userId && item && kind) &&
    canEditEquipmentMetadata({
      userId: userId!,
      role,
      equipmentCreatedBy: item!.createdBy,
    });

  const savePending =
    patchGrinder.isPending || patchMachine.isPending || patchExtra.isPending;

  async function onSave() {
    if (!item || !kind || !canEdit) return;
    const name = editName.trim();
    if (!name) {
      setLocalError("Name is required");
      return;
    }
    const synced = editorRef.current?.syncJsonModeToValue();
    if (synced == null) {
      setLocalError("Fix specs JSON before saving");
      return;
    }
    const specsPayload = normalizeSpecsForPayload(synced);
    const brandTrim = editBrand.trim();
    setLocalError(null);
    try {
      if (kind === "grinder") {
        await patchGrinder.mutateAsync({
          grinderId: item.id,
          name,
          brand: brandTrim ? brandTrim : null,
          specs: specsPayload,
        });
      } else if (kind === "machine") {
        await patchMachine.mutateAsync({
          machineId: item.id,
          name,
          brand: brandTrim ? brandTrim : null,
          specs: specsPayload,
        });
      } else if (isExtraGearKind(kind)) {
        await patchExtra.mutateAsync({
          equipmentId: item.id,
          name,
          brand: brandTrim ? brandTrim : null,
          specs: specsPayload,
        });
      }
      onOpenChange(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save");
    }
  }

  const mutationError =
    kind === "grinder"
      ? patchGrinder.error
      : kind === "machine"
        ? patchMachine.error
        : patchExtra.error;
  const errorMessage =
    localError ??
    (mutationError instanceof Error ? mutationError.message : null);

  const canEditPhoto =
    Boolean(userId && item && kind) &&
    canEditEquipmentPhoto({
      userId,
      role,
      createdBy: item!.createdBy,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit gear details</DialogTitle>
        </DialogHeader>
        {item && kind ? (
          <div className="space-y-3">
            {!canEdit ? (
              <p className="text-sm text-stone-600 dark:text-stone-400">
                You can only edit name, brand, and specs for gear you created (or as staff).
              </p>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-medium text-stone-600 dark:text-stone-400">
                Photo
              </p>
              {canEditPhoto ? (
                <EquipmentPhotoBlock
                  item={item}
                  kind={kind}
                  canEditPhoto
                  onError={setPhotoError}
                />
              ) : (
                <EquipmentPhotoDisplay item={item} />
              )}
              {photoError ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{photoError}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="gear-edit-name"
                className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400"
              >
                Name
              </label>
              <input
                id="gear-edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label
                htmlFor="gear-edit-brand"
                className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400"
              >
                Brand
              </label>
              <input
                id="gear-edit-brand"
                type="text"
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                disabled={!canEdit}
                placeholder="Optional"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            {canEdit ? (
              <EquipmentSpecsEditor
                ref={editorRef}
                type={userGearKindToEquipmentType(kind)}
                value={specsDraft}
                onChange={setSpecsDraft}
              />
            ) : null}
            {errorMessage ? (
              <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canEdit || savePending || !item}
            onClick={() => void onSave()}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {savePending ? "…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
