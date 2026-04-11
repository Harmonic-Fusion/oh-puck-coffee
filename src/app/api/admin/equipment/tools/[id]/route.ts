import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { adminPatchEquipmentBodySchema } from "@/shared/equipment/schema";
import { and, eq, ne } from "drizzle-orm";

const TOOL = "tool" as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const [tool] = await db
    .select()
    .from(equipment)
    .where(and(eq(equipment.id, id), eq(equipment.type, TOOL)))
    .limit(1);

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(tool);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = adminPatchEquipmentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.slug !== undefined && parsed.data.slug !== null) {
    const [slugTaken] = await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(
        and(eq(equipment.slug, parsed.data.slug), ne(equipment.id, id)),
      )
      .limit(1);

    if (slugTaken) {
      return NextResponse.json(
        { error: "A tool with this slug already exists" },
        { status: 409 },
      );
    }
  }

  const [tool] = await db
    .update(equipment)
    .set(parsed.data)
    .where(and(eq(equipment.id, id), eq(equipment.type, TOOL)))
    .returning();

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(tool);
}
