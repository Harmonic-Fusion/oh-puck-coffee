import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z
    .enum(["new", "reviewed", "in_progress", "complete", "wont_implement"])
    .optional(),
  priority: z.number().int().min(0).max(100).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  type FeedbackStatus = "new" | "reviewed" | "in_progress" | "complete" | "wont_implement";
  const updates: Partial<{ status: FeedbackStatus; priority: number | null }> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(feedback)
    .set(updates)
    .where(eq(feedback.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [row] = await db
    .delete(feedback)
    .where(eq(feedback.id, id))
    .returning({ id: feedback.id });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
