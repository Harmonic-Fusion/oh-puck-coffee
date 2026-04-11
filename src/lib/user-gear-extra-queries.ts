import { db } from "@/db";
import { equipment, images, userEquipment } from "@/db/schema";
import type { UserGearExtraType } from "@/shared/equipment/schema";
import { and, asc, eq, or } from "drizzle-orm";

export type UserGearListRow = {
  id: string;
  name: string;
  brand: string | null;
  specs: unknown;
  createdAt: Date;
  createdBy: string | null;
  isGlobal: boolean;
  imageId: string | null;
  thumbnailBuf: Buffer | null;
};

export async function listExtraGearMineByName(
  type: UserGearExtraType,
  userId: string,
): Promise<UserGearListRow[]> {
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: images.thumbnail,
    })
    .from(equipment)
    .innerJoin(
      userEquipment,
      and(
        eq(userEquipment.equipmentId, equipment.id),
        eq(userEquipment.userId, userId),
      ),
    )
    .leftJoin(images, eq(equipment.imageId, images.id))
    .where(eq(equipment.type, type))
    .orderBy(asc(equipment.name));
}

export async function listExtraGearAllByName(
  type: UserGearExtraType,
  userId: string,
): Promise<UserGearListRow[]> {
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: images.thumbnail,
    })
    .from(equipment)
    .leftJoin(images, eq(equipment.imageId, images.id))
    .where(
      and(
        eq(equipment.type, type),
        or(eq(equipment.isGlobal, true), eq(equipment.createdBy, userId)),
      ),
    )
    .orderBy(asc(equipment.name));
}
