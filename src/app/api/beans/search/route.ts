import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare } from "@/db/schema";
import { ilike, desc, eq, and, inArray } from "drizzle-orm";

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

  const searchCondition = search
    ? ilike(beans.name, `%${search}%`)
    : undefined;

  const results = await db
    .select({
      id: beans.id,
      name: beans.name,
    })
    .from(beans)
    .innerJoin(
      beansShare,
      and(
        eq(beans.id, beansShare.beanId),
        eq(beansShare.userId, session.user.id),
        inArray(beansShare.status, ["owner", "accepted", "self"]),
      ),
    )
    .where(searchCondition)
    .orderBy(desc(beans.createdAt))
    .limit(limit);

  return NextResponse.json(results);
}
