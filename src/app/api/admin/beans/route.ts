import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { beans, beansShare, users, origins, roasters } from "@/db/schema";
import { desc, count, ilike, and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || "";

  const conditions: (ReturnType<typeof eq> | ReturnType<typeof ilike>)[] = [
    eq(beansShare.status, "owner"),
  ];
  if (search) {
    conditions.push(ilike(beans.name, `%${search}%`));
  }
  const whereClause = and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: beans.id,
        name: beans.name,
        roastLevel: beans.roastLevel,
        origin: origins.name,
        roaster: roasters.name,
        processingMethod: beans.processingMethod,
        roastDate: beans.roastDate,
        createdBy: beansShare.userId,
        userEmail: users.email,
        createdAt: beans.createdAt,
      })
      .from(beans)
      .innerJoin(beansShare, eq(beans.id, beansShare.beanId))
      .leftJoin(users, eq(beansShare.userId, users.id))
      .leftJoin(origins, eq(beans.originId, origins.id))
      .leftJoin(roasters, eq(beans.roasterId, roasters.id))
      .where(whereClause)
      .orderBy(desc(beans.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(beans)
      .innerJoin(beansShare, eq(beans.id, beansShare.beanId))
      .where(
        search
          ? and(eq(beansShare.status, "owner"), ilike(beans.name, `%${search}%`))
          : eq(beansShare.status, "owner"),
      ),
  ]);

  return NextResponse.json({ data, total: total ?? 0, limit, offset });
}
