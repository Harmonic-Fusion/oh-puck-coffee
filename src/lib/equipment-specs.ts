import type { EquipmentType } from "@/shared/equipment/schema";
import { specsByType } from "@/shared/equipment/schema";

/** Validates and normalizes specs JSON for `equipment.specs`; returns `null` when empty after parse. */
export function validateSpecsForEquipmentType(
  type: EquipmentType,
  raw: unknown,
):
  | { ok: true; specs: Record<string, unknown> | null }
  | { ok: false; message: string } {
  const schema = specsByType[type];
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.map((i) => i.message).join("; ") || "Invalid specs",
    };
  }
  const data = parsed.data as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && Number.isNaN(v)) continue;
    cleaned[k] = v;
  }
  return {
    ok: true,
    specs: Object.keys(cleaned).length === 0 ? null : cleaned,
  };
}
