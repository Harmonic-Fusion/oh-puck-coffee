import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, count, ilike, and, SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || "";

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(ilike(users.email, `%${search}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}
