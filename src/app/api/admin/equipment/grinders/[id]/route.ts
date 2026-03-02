import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { grinders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createGrinderSchema } from "@/shared/equipment/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const [grinder] = await db
    .select()
    .from(grinders)
    .where(eq(grinders.id, id))
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
  const parsed = createGrinderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [grinder] = await db
    .update(grinders)
    .set({ name: parsed.data.name })
    .where(eq(grinders.id, id))
    .returning();

  if (!grinder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(grinder);
}
