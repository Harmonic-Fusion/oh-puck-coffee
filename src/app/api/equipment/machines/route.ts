import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { machines, shots } from "@/db/schema";
import { createMachineSchema } from "@/shared/equipment/schema";
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
        ? and(eq(shots.machineId, machines.id), eq(shots.userId, session.user.id))
        : eq(shots.machineId, machines.id);

    const results = await db
      .select({
        id: machines.id,
        name: machines.name,
        createdAt: machines.createdAt,
        lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
      })
      .from(machines)
      .leftJoin(shots, joinCondition)
      .groupBy(machines.id, machines.name, machines.createdAt)
      .orderBy(desc(sql`max(${shots.createdAt})`), asc(machines.name));

    return NextResponse.json(results);
  }

  // Default: order by name
  const results = await db
    .select()
    .from(machines)
    .orderBy(asc(machines.name));
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createMachineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [machine] = await db
    .insert(machines)
    .values(parsed.data)
    .returning();

  return NextResponse.json(machine, { status: 201 });
}
