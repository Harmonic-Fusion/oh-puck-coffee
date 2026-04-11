import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment, images, shots, userEquipment } from "@/db/schema";
import { adminPatchEquipmentBodySchema } from "@/shared/equipment/schema";
import { count, eq, or } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [eqRow] = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);

  if (!eqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let imageUrl: string | null = null;
  if (eqRow.imageId) {
    const [img] = await db.select({ url: images.url }).from(images).where(eq(images.id, eqRow.imageId)).limit(1);
    imageUrl = img?.url ?? null;
  }

  const [{ shotsCount }] = await db
    .select({ shotsCount: count() })
    .from(shots)
    .where(or(eq(shots.grinderId, id), eq(shots.machineId, id)));

  const [{ userCollectionCount }] = await db
    .select({ userCollectionCount: count() })
    .from(userEquipment)
    .where(eq(userEquipment.equipmentId, id));

  return NextResponse.json({
    ...eqRow,
    imageUrl,
    stats: {
      shotsCount,
      userCollectionCount,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminPatchEquipmentBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  if (body.slug !== undefined && body.slug !== null) {
    const [conflict] = await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(eq(equipment.slug, body.slug))
      .limit(1);
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "A tool with this slug already exists" }, { status: 409 });
    }
  }

  const updatePayload = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined),
  ) as Partial<typeof equipment.$inferInsert>;

  const [updated] = await db
    .update(equipment)
    .set(updatePayload)
    .where(eq(equipment.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let imageUrl: string | null = null;
  if (updated.imageId) {
    const [img] = await db
      .select({ url: images.url })
      .from(images)
      .where(eq(images.id, updated.imageId))
      .limit(1);
    imageUrl = img?.url ?? null;
  }

  const [{ shotsCount }] = await db
    .select({ shotsCount: count() })
    .from(shots)
    .where(or(eq(shots.grinderId, id), eq(shots.machineId, id)));

  const [{ userCollectionCount }] = await db
    .select({ userCollectionCount: count() })
    .from(userEquipment)
    .where(eq(userEquipment.equipmentId, id));

  return NextResponse.json({
    ...updated,
    imageUrl,
    stats: {
      shotsCount,
      userCollectionCount,
    },
  });
}
