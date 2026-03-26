import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans } from "@/db/schema";
import { eq, sql, gte, count, avg, and, isNotNull } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Members can only see their own stats, admins see all
  const whereConditions = [eq(shots.isHidden, false)];
  if (session.user.role !== "admin") {
    whereConditions.push(eq(shots.userId, session.user.id));
  }
  const whereClause = and(...whereConditions);

  // Total shots (excluding hidden)
  const [totalResult] = await db
    .select({ count: count() })
    .from(shots)
    .where(whereClause);
  const totalShots = totalResult.count;

  // Average quality (excluding hidden)
  const [avgQualityResult] = await db
    .select({ avg: avg(shots.shotQuality) })
    .from(shots)
    .where(whereClause);
  const avgQuality = avgQualityResult.avg
    ? parseFloat(parseFloat(avgQualityResult.avg).toFixed(1))
    : null;

  // Average rating (excluding hidden, only where rating is not null)
  const [avgRatingResult] = await db
    .select({ avg: avg(shots.rating) })
    .from(shots)
    .where(whereClause);
  const avgRating = avgRatingResult.avg
    ? parseFloat(parseFloat(avgRatingResult.avg).toFixed(1))
    : null;

  // Average brew ratio (computed from dose/yield, excluding hidden)
  const allShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
    })
    .from(shots)
    .where(whereClause);

  let avgBrewRatio: number | null = null;
  if (allShots.length > 0) {
    const ratios = allShots
      .map((s) => {
        if (!s.doseGrams || !s.yieldGrams) return null;
        const dose = parseFloat(s.doseGrams);
        const yieldG = parseFloat(s.yieldGrams);
        return dose > 0 ? yieldG / dose : null;
      })
      .filter((r): r is number => r !== null);
    if (ratios.length > 0) {
      avgBrewRatio = parseFloat(
        (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2)
      );
    }
  }

  // Most-used bean (excluding hidden)
  const [mostUsedBean] = await db
    .select({
      beanId: shots.beanId,
      beanName: beans.name,
      count: count(),
    })
    .from(shots)
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .where(whereClause)
    .groupBy(shots.beanId, beans.name)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  // Shots this week (excluding hidden)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekConditions = [gte(shots.createdAt, oneWeekAgo), eq(shots.isHidden, false)];
  if (session.user.role !== "admin") {
    weekConditions.push(eq(shots.userId, session.user.id));
  }
  const [weekResult] = await db
    .select({ count: count() })
    .from(shots)
    .where(and(...weekConditions));
  const shotsThisWeek = weekResult.count;

  // Average dose (excluding hidden, only where doseGrams is not null)
  const [avgDoseResult] = await db
    .select({ avg: avg(shots.doseGrams) })
    .from(shots)
    .where(and(whereClause, isNotNull(shots.doseGrams)));
  const avgDose = avgDoseResult.avg
    ? parseFloat(parseFloat(avgDoseResult.avg).toFixed(1))
    : null;

  // Count of distinct beans used (excluding hidden)
  const [beansCountResult] = await db
    .select({ count: sql<number>`count(distinct ${shots.beanId})` })
    .from(shots)
    .where(whereClause);
  const beansCount = Number(beansCountResult.count);

  // Current streak: consecutive days with at least one shot, ending today or yesterday
  const shotDates = await db
    .select({ createdAt: shots.createdAt })
    .from(shots)
    .where(whereClause)
    .orderBy(sql`${shots.createdAt} desc`);

  const uniqueDays = new Set<string>();
  for (const s of shotDates) {
    // Use UTC date string to keep comparisons consistent server-side
    uniqueDays.add(s.createdAt.toISOString().slice(0, 10));
  }

  let currentStreak = 0;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const cursor = new Date(todayUtc);
  // Allow streak to start from today or yesterday (so it isn't broken mid-day)
  if (!uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return NextResponse.json({
    totalShots,
    avgQuality,
    avgRating,
    avgBrewRatio,
    avgDose,
    beansCount,
    currentStreak,
    mostUsedBean: mostUsedBean
      ? { id: mostUsedBean.beanId, name: mostUsedBean.beanName, shotCount: mostUsedBean.count }
      : null,
    shotsThisWeek,
  });
}
