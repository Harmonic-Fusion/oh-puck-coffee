import { thumbnailBufferToBase64 } from "@/lib/images";

export function specsFromDb(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}
import type { EquipmentListScope } from "@/shared/equipment/schema";
import { equipmentListScopeSchema } from "@/shared/equipment/schema";

export function parseEquipmentListScope(
  searchParams: URLSearchParams,
): EquipmentListScope | "invalid" {
  const raw = searchParams.get("scope") ?? "mine";
  const parsed = equipmentListScopeSchema.safeParse(raw);
  if (!parsed.success) return "invalid";
  return parsed.data;
}

export function equipmentImageFields(
  imageId: string | null,
  thumbnail: Buffer | null,
): { imageUrl: string | null; thumbnailBase64: string | null } {
  if (!imageId || thumbnail === null || thumbnail === undefined) {
    return { imageUrl: null, thumbnailBase64: null };
  }
  return {
    imageUrl: `/api/images/${imageId}`,
    thumbnailBase64: thumbnailBufferToBase64(Buffer.from(thumbnail)),
  };
}

/** Brand + image + optional specs for list/detail JSON responses (grinders, machines, tools). */
export function equipmentListItemFields(
  brand: string | null,
  imageId: string | null,
  thumbnail: Buffer | null,
  specs?: Record<string, unknown> | null,
): {
  brand: string | null;
  imageUrl: string | null;
  thumbnailBase64: string | null;
  specs: Record<string, unknown> | null;
} {
  return {
    brand,
    ...equipmentImageFields(imageId, thumbnail),
    specs: specs ?? null,
  };
}
