import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, shots } from "@/db/schema";
import { createBeanSchema } from "@/shared/beans/schema";
import { ilike, desc, eq, and, max, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const orderBy = searchParams.get("orderBy");

  // Members can only see beans they created, admins can see all
  const beanConditions = [];
  if (session.user.role !== "admin") {
    beanConditions.push(eq(beans.createdBy, session.user.id));
  }
  if (search) {
    beanConditions.push(ilike(beans.name, `%${search}%`));
  }

  const beanWhereClause =
    beanConditions.length > 0 ? and(...beanConditions) : undefined;

  // If ordering by recent usage, join with shots and order by max createdAt
  if (orderBy === "recent") {
    // Members can only see their own shots, admins see all shots
    const joinCondition =
      session.user.role !== "admin"
        ? and(eq(shots.beanId, beans.id), eq(shots.userId, session.user.id))
        : eq(shots.beanId, beans.id);

    const results = await db
      .select({
        id: beans.id,
        name: beans.name,
        origin: beans.origin,
        roaster: beans.roaster,
        processingMethod: beans.processingMethod,
        roastLevel: beans.roastLevel,
        roastDate: beans.roastDate,
        isRoastDateBestGuess: beans.isRoastDateBestGuess,
        createdBy: beans.createdBy,
        createdAt: beans.createdAt,
        lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
      })
      .from(beans)
      .leftJoin(shots, joinCondition)
      .where(beanWhereClause)
      .groupBy(
        beans.id,
        beans.name,
        beans.origin,
        beans.roaster,
        beans.processingMethod,
        beans.roastLevel,
        beans.roastDate,
        beans.isRoastDateBestGuess,
        beans.createdBy,
        beans.createdAt
      )
      .orderBy(desc(sql`max(${shots.createdAt})`), desc(beans.createdAt));

    return NextResponse.json(results);
  }

  // Default: order by createdAt desc
  const results = await db
    .select()
    .from(beans)
    .where(beanWhereClause)
    .orderBy(desc(beans.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBeanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [bean] = await db
    .insert(beans)
    .values({
      ...parsed.data,
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json(bean, { status: 201 });
}
