import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { beans, users } from "@/db/schema";
import { desc, count, ilike, and, SQL, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || "";

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(ilike(beans.name, `%${search}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: beans.id,
        name: beans.name,
        roastLevel: beans.roastLevel,
        roaster: beans.roaster,
        origin: beans.origin,
        processingMethod: beans.processingMethod,
        roastDate: beans.roastDate,
        userId: beans.userId,
        userEmail: users.email,
        createdAt: beans.createdAt,
      })
      .from(beans)
      .leftJoin(users, eq(beans.userId, users.id))
      .where(whereClause)
      .orderBy(desc(beans.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(beans).where(whereClause),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}
