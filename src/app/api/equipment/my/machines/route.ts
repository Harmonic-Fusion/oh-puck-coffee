import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, userEquipment } from "@/db/schema";
import {
  createMachineSchema,
  myMachineCollectionBodySchema,
} from "@/shared/equipment/schema";
import { and, eq } from "drizzle-orm";
import { createEquipmentId } from "@/lib/nanoid-ids";
import { equipmentListItemFields, specsFromDb } from "@/lib/equipment-list";
import { validateSpecsForEquipmentType } from "@/lib/equipment-specs";

const MACHINE = "machine" as const;

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

  const parsed = myMachineCollectionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.machineId) {
    const machineId = parsed.data.machineId;
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
      .where(and(eq(equipment.id, machineId), eq(equipment.type, MACHINE)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
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
        ...equipmentListItemFields(
          row.brand,
          row.imageId,
          row.thumbnailBuf,
          specsFromDb(row.specs),
        ),
      },
      { status: 201 },
    );
  }

  const nameParsed = createMachineSchema.safeParse({ name: parsed.data.name });
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
      and(
        eq(equipment.type, MACHINE),
        eq(equipment.name, nameParsed.data.name),
      ),
    )
    .limit(1);

  if (nameTaken) {
    return NextResponse.json(
      { error: "A machine with this name already exists" },
      { status: 409 },
    );
  }

  const machineId = createEquipmentId();
  const brandFromBody = parsed.data.brand;
  const brandToStore =
    typeof brandFromBody === "string" && brandFromBody.trim() !== ""
      ? brandFromBody.trim()
      : null;

  let specsToInsert: Record<string, unknown> | null = null;
  if (parsed.data.specs !== undefined) {
    const v = validateSpecsForEquipmentType("machine", parsed.data.specs);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
    specsToInsert = v.specs;
  }

  let imageIdToStore: string | null = null;
  if (parsed.data.imageId) {
    const [owned] = await db
      .select({ id: images.id })
      .from(images)
      .where(and(eq(images.id, parsed.data.imageId), eq(images.userId, userId)))
      .limit(1);
    if (!owned) {
      return NextResponse.json(
        { error: "Image not found or not owned by you" },
        { status: 400 },
      );
    }
    imageIdToStore = owned.id;
  }

  const [machine] = await db
    .insert(equipment)
    .values({
      id: machineId,
      type: MACHINE,
      name: nameParsed.data.name,
      brand: brandToStore,
      specs: specsToInsert,
      createdBy: userId,
      isGlobal: false,
      imageId: imageIdToStore,
    })
    .returning();

  if (!machine) {
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }

  await db
    .insert(userEquipment)
    .values({ userId, equipmentId: machine.id })
    .onConflictDoNothing();

  let thumbnailBuf: Buffer | null = null;
  if (machine.imageId) {
    const [imgRow] = await db
      .select({ thumbnail: images.thumbnail })
      .from(images)
      .where(eq(images.id, machine.imageId))
      .limit(1);
    thumbnailBuf = imgRow?.thumbnail ?? null;
  }

  return NextResponse.json(
    {
      id: machine.id,
      name: machine.name,
      createdAt: machine.createdAt,
      createdBy: machine.createdBy,
      isGlobal: machine.isGlobal,
      ...equipmentListItemFields(
        machine.brand,
        machine.imageId,
        thumbnailBuf,
        specsFromDb(machine.specs),
      ),
    },
    { status: 201 },
  );
}
