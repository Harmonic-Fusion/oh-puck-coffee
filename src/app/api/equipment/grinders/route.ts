import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { grinders, shots } from "@/db/schema";
import { createGrinderSchema } from "@/shared/equipment/schema";
import { asc, desc, eq, max, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderBy = searchParams.get("orderBy");

  // If ordering by recent usage, join with shots and order by max createdAt
  if (orderBy === "recent") {
    // Members can only see their own shots, admins see all shots
    const joinCondition =
      session.user.role !== "admin"
        ? and(eq(shots.grinderId, grinders.id), eq(shots.userId, session.user.id))
        : eq(shots.grinderId, grinders.id);

    const results = await db
      .select({
        id: grinders.id,
        name: grinders.name,
        createdAt: grinders.createdAt,
        lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
      })
      .from(grinders)
      .leftJoin(shots, joinCondition)
      .groupBy(grinders.id, grinders.name, grinders.createdAt)
      .orderBy(desc(sql`max(${shots.createdAt})`), asc(grinders.name));

    return NextResponse.json(results);
  }

  // Default: order by name
  const results = await db
    .select()
    .from(grinders)
    .orderBy(asc(grinders.name));
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createGrinderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [grinder] = await db
    .insert(grinders)
    .values(parsed.data)
    .returning();

  return NextResponse.json(grinder, { status: 201 });
}
