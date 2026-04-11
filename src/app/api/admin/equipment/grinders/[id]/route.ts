import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { adminPatchEquipmentBodySchema } from "@/shared/equipment/schema";
import { and, eq } from "drizzle-orm";

const GRINDER = "grinder" as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const [grinder] = await db
    .select()
    .from(equipment)
    .where(and(eq(equipment.id, id), eq(equipment.type, GRINDER)))
    .limit(1);

  if (!grinder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(grinder);
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

  const { slug, ...rest } = parsed.data;
  void slug;
  if (Object.keys(rest).length === 0) {
    return NextResponse.json(
      { error: "Validation failed", details: { formErrors: ["Provide at least one updatable field (slug is not valid for grinders)"] } },
      { status: 400 },
    );
  }

  const [grinder] = await db
    .update(equipment)
    .set(rest)
    .where(and(eq(equipment.id, id), eq(equipment.type, GRINDER)))
    .returning();

  if (!grinder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(grinder);
}
