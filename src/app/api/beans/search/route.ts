import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans } from "@/db/schema";
import { ilike, desc, eq, and } from "drizzle-orm";

/**
 * GET /api/beans/search
 * Returns concise bean search results for filter prepopulation
 * Query params:
 *   - search: search term (optional)
 *   - limit: max results (default: 50)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Members can only see beans they created, admins can see all
  const beanConditions = [];
  if (session.user.role !== "admin") {
    beanConditions.push(eq(beans.userId, session.user.id));
  }
  if (search) {
    beanConditions.push(ilike(beans.name, `%${search}%`));
  }

  const beanWhereClause =
    beanConditions.length > 0 ? and(...beanConditions) : undefined;

  const results = await db
    .select({
      id: beans.id,
      name: beans.name,
    })
    .from(beans)
    .where(beanWhereClause)
    .orderBy(desc(beans.createdAt))
    .limit(limit);

  return NextResponse.json(results);
}
