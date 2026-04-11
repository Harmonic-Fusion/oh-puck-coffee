import { NextResponse } from "next/server";
import { db } from "@/db";
import { equipment, images } from "@/db/schema";
import {
  patchUserEquipmentBodySchema,
  type EquipmentType,
} from "@/shared/equipment/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  canEditEquipmentMetadata,
  canSetEquipmentImage,
  isSuperAdminRole,
} from "@/lib/equipment-authorization";
import { equipmentListItemFields, specsFromDb } from "@/lib/equipment-list";
import { validateSpecsForEquipmentType } from "@/lib/equipment-specs";
import type { Session } from "next-auth";

export async function applyUserEquipmentPatchJson(
  equipmentId: string,
  expectedType: EquipmentType,
  session: Session | null,
  body: unknown,
): Promise<Response> {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchUserEquipmentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (
    parsed.data.isGlobal !== undefined &&
    !isSuperAdminRole(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [existing] = await db
    .select({
      id: equipment.id,
      type: equipment.type,
      name: equipment.name,
      createdBy: equipment.createdBy,
    })
    .from(equipment)
    .where(and(eq(equipment.id, equipmentId), eq(equipment.type, expectedType)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const wantsMeta =
    parsed.data.name !== undefined ||
    parsed.data.brand !== undefined ||
    parsed.data.specs !== undefined;

  if (wantsMeta) {
    const allowed = canEditEquipmentMetadata({
      userId: session.user.id,
      role: session.user.role,
      equipmentCreatedBy: existing.createdBy,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    const [conflict] = await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(
        and(
          eq(equipment.type, expectedType),
          eq(equipment.name, parsed.data.name),
          ne(equipment.id, equipmentId),
        ),
      )
      .limit(1);
    if (conflict) {
      return NextResponse.json(
        { error: "Equipment with this name already exists" },
        { status: 409 },
      );
    }
  }

  if (parsed.data.imageId !== undefined) {
    const allowed = canSetEquipmentImage({
      userId: session.user.id,
      role: session.user.role,
      equipmentCreatedBy: existing.createdBy,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.imageId !== null) {
      const [img] = await db
        .select({ id: images.id, userId: images.userId })
        .from(images)
        .where(eq(images.id, parsed.data.imageId))
        .limit(1);

      if (!img) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      if (img.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Image does not belong to you" },
          { status: 403 },
        );
      }
    }
  }

  let specsToStore: Record<string, unknown> | null | undefined;
  if (parsed.data.specs !== undefined) {
    const v = validateSpecsForEquipmentType(expectedType, parsed.data.specs);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
    specsToStore = v.specs;
  }

  const set: {
    imageId?: string | null;
    isGlobal?: boolean;
    name?: string;
    brand?: string | null;
    specs?: Record<string, unknown> | null;
  } = {};

  if (parsed.data.imageId !== undefined) {
    set.imageId = parsed.data.imageId;
  }
  if (parsed.data.isGlobal !== undefined) {
    set.isGlobal = parsed.data.isGlobal;
  }
  if (parsed.data.name !== undefined) {
    set.name = parsed.data.name;
  }
  if (parsed.data.brand !== undefined) {
    set.brand = parsed.data.brand;
  }
  if (parsed.data.specs !== undefined) {
    set.specs = specsToStore ?? null;
  }

  await db
    .update(equipment)
    .set(set)
    .where(and(eq(equipment.id, equipmentId), eq(equipment.type, expectedType)));

  const [row] = await db
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
    .where(and(eq(equipment.id, equipmentId), eq(equipment.type, expectedType)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const specsOut = specsFromDb(row.specs);
  return NextResponse.json({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    isGlobal: row.isGlobal,
    ...equipmentListItemFields(row.brand, row.imageId, row.thumbnailBuf, specsOut),
  });
}

