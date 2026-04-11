import type { Grinder, Machine } from "@/shared/equipment/schema";
import {
  ADMIN_EQUIPMENT_TYPE_OPTIONS,
  USER_GEAR_EXTRA_TYPES,
  type EquipmentType,
  type UserGearExtraType,
} from "@/shared/equipment/schema";

export type GearCollectionEntry =
  | { kind: "grinder"; item: Grinder }
  | { kind: "machine"; item: Machine }
  | { kind: UserGearExtraType; item: Grinder };

type ExtraGearQueryLike = {
  data: Grinder[] | undefined;
  isLoading: boolean;
};

export function foldExtraGearQueries(queries: Record<UserGearExtraType, ExtraGearQueryLike>): {
  byType: Record<UserGearExtraType, Grinder[]>;
  isLoading: boolean;
} {
  const byType = {} as Record<UserGearExtraType, Grinder[]>;
  let isLoading = false;
  for (const t of USER_GEAR_EXTRA_TYPES) {
    const q = queries[t];
    byType[t] = q.data ?? [];
    if (q.isLoading) isLoading = true;
  }
  return { byType, isLoading };
}

export function buildAllGearCollectionEntries(
  myGrinders: Grinder[] | undefined,
  myMachines: Machine[] | undefined,
  extraMineByType: Record<UserGearExtraType, Grinder[]>,
): GearCollectionEntry[] {
  const parts: GearCollectionEntry[] = [
    ...(myGrinders ?? []).map((item) => ({ kind: "grinder" as const, item })),
    ...(myMachines ?? []).map((item) => ({ kind: "machine" as const, item })),
    ...USER_GEAR_EXTRA_TYPES.flatMap((t) =>
      extraMineByType[t].map((item) => ({ kind: t, item })),
    ),
  ];
  parts.sort((a, b) => a.item.name.localeCompare(b.item.name));
  return parts;
}

export function filterGearEntriesByTypeOnly(
  all: GearCollectionEntry[],
  selectedType: "all" | EquipmentType,
): GearCollectionEntry[] {
  if (selectedType === "all") return all;
  if (selectedType === "tool") return [];
  return all.filter((e) => e.kind === selectedType);
}

export function filterGearEntriesByTypeAndSearch(
  all: GearCollectionEntry[],
  selectedType: "all" | EquipmentType,
  searchRaw: string,
): GearCollectionEntry[] {
  const rows = filterGearEntriesByTypeOnly(all, selectedType);
  const q = searchRaw.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (e) =>
      e.item.name.toLowerCase().includes(q) ||
      (e.item.brand?.toLowerCase().includes(q) ?? false),
  );
}

export function labelForGearEntryKind(kind: GearCollectionEntry["kind"]): string {
  return (
    ADMIN_EQUIPMENT_TYPE_OPTIONS.find((o) => o.value === kind)?.label ?? kind
  );
}
