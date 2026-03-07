import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shots, users } from "@/db/schema";
import { gte, eq, desc, count, countDistinct } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dauResult, leaderboard] = await Promise.all([
    // Daily Active Users: unique users who pulled shots in the last 24 hours
    db
      .select({ count: countDistinct(shots.userId) })
      .from(shots)
      .where(gte(shots.createdAt, oneDayAgo)),

    // User Leaderboard: top N users by shot count
    db
      .select({
        userId: shots.userId,
        userName: users.name,
        userEmail: users.email,
        shotCount: count(shots.id),
      })
      .from(shots)
      .leftJoin(users, eq(shots.userId, users.id))
      .groupBy(shots.userId, users.name, users.email)
      .orderBy(desc(count(shots.id)))
      .limit(limit),
  ]);

  return NextResponse.json({
    dailyActiveUsers: dauResult[0]?.count ?? 0,
    leaderboard,
  });
}
