import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMachineSchema } from "@/shared/equipment/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const [machine] = await db
    .select()
    .from(machines)
    .where(eq(machines.id, id))
    .limit(1);

  if (!machine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(machine);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = createMachineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [machine] = await db
    .update(machines)
    .set({ name: parsed.data.name })
    .where(eq(machines.id, id))
    .returning();

  if (!machine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(machine);
}
