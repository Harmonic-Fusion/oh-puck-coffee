import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { userGearExtraTypeSchema } from "@/shared/equipment/schema";
import { eq } from "drizzle-orm";
import { applyUserEquipmentPatchJson } from "@/lib/user-equipment-patch";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const { id: equipmentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const [existing] = await db
    .select({ type: equipment.type })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const typeParsed = userGearExtraTypeSchema.safeParse(existing.type);
  if (!typeParsed.success) {
    return NextResponse.json(
      { error: "Wrong equipment type for this endpoint" },
      { status: 400 },
    );
  }

  return applyUserEquipmentPatchJson(
    equipmentId,
    typeParsed.data,
    session,
    body,
  );
}
