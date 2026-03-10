import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z
    .enum(["new", "reviewed", "in_progress", "complete", "wont_implement"])
    .optional(),
  priority: z.number().int().min(0).max(100).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ids, status, priority } = parsed.data;

  type FeedbackStatus = "new" | "reviewed" | "in_progress" | "complete" | "wont_implement";
  const updates: Partial<{ status: FeedbackStatus; priority: number | null }> = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Provide at least one of: status, priority" },
      { status: 400 }
    );
  }

  const rows = await db
    .update(feedback)
    .set(updates)
    .where(inArray(feedback.id, ids))
    .returning({ id: feedback.id });

  return NextResponse.json({ updated: rows.length });
}

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function DELETE(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;

  const rows = await db
    .delete(feedback)
    .where(inArray(feedback.id, ids))
    .returning({ id: feedback.id });

  return NextResponse.json({ deleted: rows.length });
}
