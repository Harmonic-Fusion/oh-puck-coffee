import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { shots, users } from "@/db/schema";
import { gte, count, countDistinct, sql } from "drizzle-orm";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsersResult, dauResult, totalShotsResult, shotsPerDay] =
    await Promise.all([
      db.select({ total: count() }).from(users),

      db
        .select({ count: countDistinct(shots.userId) })
        .from(shots)
        .where(gte(shots.createdAt, oneDayAgo)),

      db.select({ total: count() }).from(shots),

      db
        .select({
          date: sql<string>`DATE(${shots.createdAt})`,
          shots: count(shots.id),
          activeUsers: countDistinct(shots.userId),
        })
        .from(shots)
        .where(gte(shots.createdAt, fourteenDaysAgo))
        .groupBy(sql`DATE(${shots.createdAt})`)
        .orderBy(sql`DATE(${shots.createdAt})`),
    ]);

  return NextResponse.json({
    totalUsers: totalUsersResult[0]?.total ?? 0,
    dailyActiveUsers: dauResult[0]?.count ?? 0,
    totalShots: totalShotsResult[0]?.total ?? 0,
    shotsPerDay,
  });
}
