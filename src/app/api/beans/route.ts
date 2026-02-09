import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { beans } from "@/db/schema";
import { createBeanSchema } from "@/shared/beans/schema";
import { ilike, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const whereClause = search
    ? ilike(beans.name, `%${search}%`)
    : undefined;

  const results = await db
    .select()
    .from(beans)
    .where(whereClause)
    .orderBy(desc(beans.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await auth();
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
