import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { users, subscriptions, userEntitlements, shots, beans, beansShare } from "@/db/schema";
import { desc, count, avg, min, max, sql, ilike, and, eq, inArray, isNotNull, SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
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

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        isCustomName: users.isCustomName,
        subscriptionStatus: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(whereClause)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);

  const userIds = rows.map((r) => r.id);

  const [entitlementRows, shotStatsRows, beanStatsRows, beanUsageRows, shotsWithFlavors] =
    await Promise.all([
      userIds.length > 0
        ? db
            .select({ userId: userEntitlements.userId, lookupKey: userEntitlements.lookupKey })
            .from(userEntitlements)
            .where(inArray(userEntitlements.userId, userIds))
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({
              userId: shots.userId,
              shotCount: count(),
              firstShot: min(shots.createdAt),
              lastShot: max(shots.createdAt),
              avgQuality: avg(shots.shotQuality),
              avgRating: avg(shots.rating),
              avgBrewRatio: sql<string | null>`AVG(CASE WHEN ${shots.doseGrams}::float > 0 THEN ${shots.yieldActualGrams}::float / ${shots.doseGrams}::float END)`,
            })
            .from(shots)
            .where(inArray(shots.userId, userIds))
            .groupBy(shots.userId)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({ userId: beansShare.userId, beanCount: count() })
            .from(beansShare)
            .where(
              and(
                inArray(beansShare.userId, userIds),
                inArray(beansShare.status, ["owner", "self"]),
              ),
            )
            .groupBy(beansShare.userId)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({
              userId: shots.userId,
              beanId: shots.beanId,
              cnt: count(),
              beanName: beans.name,
            })
            .from(shots)
            .innerJoin(beans, eq(shots.beanId, beans.id))
            .where(inArray(shots.userId, userIds))
            .groupBy(shots.userId, shots.beanId, beans.name)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({ userId: shots.userId, flavors: shots.flavors })
            .from(shots)
            .where(and(inArray(shots.userId, userIds), isNotNull(shots.flavors)))
        : Promise.resolve([]),
    ]);

  // Build lookup maps
  const entitlementsByUser = new Map<string, string[]>();
  for (const row of entitlementRows) {
    const list = entitlementsByUser.get(row.userId) ?? [];
    list.push(row.lookupKey);
    entitlementsByUser.set(row.userId, list);
  }

  const shotStatsByUser = new Map<string, (typeof shotStatsRows)[0]>();
  for (const row of shotStatsRows) {
    shotStatsByUser.set(row.userId, row);
  }

  const beanCountByUser = new Map<string, number>();
  for (const row of beanStatsRows) {
    beanCountByUser.set(row.userId, row.beanCount);
  }

  // Most used bean per user
  const mostUsedBeanByUser = new Map<string, string>();
  const bestCountByUser = new Map<string, number>();
  for (const row of beanUsageRows) {
    const current = bestCountByUser.get(row.userId) ?? 0;
    if (row.cnt > current) {
      bestCountByUser.set(row.userId, row.cnt);
      mostUsedBeanByUser.set(row.userId, row.beanName);
    }
  }

  // Top 3 flavors per user
  const flavorCountsByUser = new Map<string, Map<string, number>>();
  for (const s of shotsWithFlavors) {
    if (!s.flavors || !Array.isArray(s.flavors)) continue;
    const userFlavors = flavorCountsByUser.get(s.userId) ?? new Map<string, number>();
    for (const flavor of s.flavors as string[]) {
      userFlavors.set(flavor, (userFlavors.get(flavor) ?? 0) + 1);
    }
    flavorCountsByUser.set(s.userId, userFlavors);
  }
  const topFlavorsByUser = new Map<string, string[]>();
  for (const [userId, flavorMap] of flavorCountsByUser) {
    const top = Array.from(flavorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f]) => f);
    topFlavorsByUser.set(userId, top);
  }

  const data = rows.map((row) => {
    const stats = shotStatsByUser.get(row.id);
    return {
      ...row,
      entitlements: entitlementsByUser.get(row.id) ?? [],
      shotCount: stats?.shotCount ?? 0,
      beanCount: beanCountByUser.get(row.id) ?? 0,
      firstShot: stats?.firstShot ?? null,
      lastShot: stats?.lastShot ?? null,
      avgQuality: stats?.avgQuality != null ? parseFloat(stats.avgQuality as unknown as string) : null,
      avgRating: stats?.avgRating != null ? parseFloat(stats.avgRating as unknown as string) : null,
      avgBrewRatio: stats?.avgBrewRatio != null ? parseFloat(stats.avgBrewRatio as string) : null,
      mostUsedBean: mostUsedBeanByUser.get(row.id) ?? null,
      topFlavors: topFlavorsByUser.get(row.id) ?? [],
    };
  });

  return NextResponse.json({ data, total, limit, offset });
}
