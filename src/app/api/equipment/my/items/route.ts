import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, userEquipment } from "@/db/schema";
import { equipmentListItemFields, specsFromDb } from "@/lib/equipment-list";
import { validateSpecsForEquipmentType } from "@/lib/equipment-specs";
import type { EquipmentType } from "@/shared/equipment/schema";
import { createEquipmentId } from "@/lib/nanoid-ids";
import {
  createGrinderSchema,
  myGenericGearCollectionBodySchema,
} from "@/shared/equipment/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = myGenericGearCollectionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const gearType = parsed.data.equipmentType;

  if (parsed.data.equipmentId) {
    const equipmentId = parsed.data.equipmentId;
    const [row] = await db
      .select({
        id: equipment.id,
        name: equipment.name,
        brand: equipment.brand,
        createdAt: equipment.createdAt,
        createdBy: equipment.createdBy,
        isGlobal: equipment.isGlobal,
        imageId: equipment.imageId,
        specs: equipment.specs,
        thumbnailBuf: images.thumbnail,
      })
      .from(equipment)
      .leftJoin(images, eq(equipment.imageId, images.id))
      .where(and(eq(equipment.id, equipmentId), eq(equipment.type, gearType)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const visible = row.isGlobal || row.createdBy === userId;
    if (!visible) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .insert(userEquipment)
      .values({ userId, equipmentId: row.id })
      .onConflictDoNothing();

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        isGlobal: row.isGlobal,
        ...equipmentListItemFields(row.brand, row.imageId, row.thumbnailBuf),
      },
      { status: 201 },
    );
  }

  const nameParsed = createGrinderSchema.safeParse({ name: parsed.data.name });
  if (!nameParsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: nameParsed.error.flatten() },
      { status: 400 },
    );
  }

  const [nameTaken] = await db
    .select({ id: equipment.id })
    .from(equipment)
    .where(
      and(eq(equipment.type, gearType), eq(equipment.name, nameParsed.data.name)),
    )
    .limit(1);

  if (nameTaken) {
    return NextResponse.json(
      { error: "Equipment with this name already exists" },
      { status: 409 },
    );
  }

  const newId = createEquipmentId();
  const brandFromBody = parsed.data.brand;
  const brandToStore =
    typeof brandFromBody === "string" && brandFromBody.trim() !== ""
      ? brandFromBody.trim()
      : null;

  let specsToInsert: Record<string, unknown> | null = null;
  if (parsed.data.specs !== undefined) {
    const v = validateSpecsForEquipmentType(gearType as EquipmentType, parsed.data.specs);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
    specsToInsert = v.specs;
  }

  const [created] = await db
    .insert(equipment)
    .values({
      id: newId,
      type: gearType,
      name: nameParsed.data.name,
      brand: brandToStore,
      specs: specsToInsert,
      createdBy: userId,
      isGlobal: false,
    })
    .returning();

  if (!created) {
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }

  await db
    .insert(userEquipment)
    .values({ userId, equipmentId: created.id })
    .onConflictDoNothing();

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt,
      createdBy: created.createdBy,
      isGlobal: created.isGlobal,
      ...equipmentListItemFields(
        created.brand,
        created.imageId,
        null,
        specsFromDb(created.specs),
      ),
    },
    { status: 201 },
  );
}
