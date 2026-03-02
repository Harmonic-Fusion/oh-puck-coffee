import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { tools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToolSchema } from "@/shared/equipment/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = createToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [tool] = await db
    .update(tools)
    .set({ name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description ?? null })
    .where(eq(tools.id, id))
    .returning();

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(tool);
}
