import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { grinders } from "@/db/schema";
import { asc, count } from "drizzle-orm";
import { createGrinderSchema } from "@/shared/equipment/schema";
import { createGrinderId } from "@/lib/nanoid-ids";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [data, [{ total }]] = await Promise.all([
    db.select().from(grinders).orderBy(asc(grinders.name)).limit(limit).offset(offset),
    db.select({ total: count() }).from(grinders),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createGrinderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [grinder] = await db.insert(grinders).values({ ...parsed.data, id: createGrinderId() }).returning();
  return NextResponse.json(grinder, { status: 201 });
}
