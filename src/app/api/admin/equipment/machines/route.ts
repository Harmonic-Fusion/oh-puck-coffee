import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { asc, count, eq } from "drizzle-orm";
import { createMachineSchema } from "@/shared/equipment/schema";
import { createEquipmentId } from "@/lib/nanoid-ids";

const MACHINE = "machine" as const;

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const typeCond = eq(equipment.type, MACHINE);

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(equipment)
      .where(typeCond)
      .orderBy(asc(equipment.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(equipment).where(typeCond),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createMachineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [machine] = await db
    .insert(equipment)
    .values({
      id: createEquipmentId(),
      type: MACHINE,
      name: parsed.data.name,
      isGlobal: true,
      adminApproved: true,
    })
    .returning();
  return NextResponse.json(machine, { status: 201 });
}
