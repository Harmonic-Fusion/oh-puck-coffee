import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans } from "@/db/schema";
import { eq, sql, gte, count, avg } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Total shots
  const [totalResult] = await db
    .select({ count: count() })
    .from(shots);
  const totalShots = totalResult.count;

  // Average quality
  const [avgQualityResult] = await db
    .select({ avg: avg(shots.shotQuality) })
    .from(shots);
  const avgQuality = avgQualityResult.avg
    ? parseFloat(parseFloat(avgQualityResult.avg).toFixed(1))
    : null;

  // Average brew ratio (computed from dose/yield)
  const allShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
    })
    .from(shots);

  let avgBrewRatio: number | null = null;
  if (allShots.length > 0) {
    const ratios = allShots
      .map((s) => {
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

  // Most-used bean
  const [mostUsedBean] = await db
    .select({
      beanId: shots.beanId,
      beanName: beans.name,
      count: count(),
    })
    .from(shots)
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .groupBy(shots.beanId, beans.name)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  // Shots this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const [weekResult] = await db
    .select({ count: count() })
    .from(shots)
    .where(gte(shots.createdAt, oneWeekAgo));
  const shotsThisWeek = weekResult.count;

  return NextResponse.json({
    totalShots,
    avgQuality,
    avgBrewRatio,
    mostUsedBean: mostUsedBean
      ? { id: mostUsedBean.beanId, name: mostUsedBean.beanName, shotCount: mostUsedBean.count }
      : null,
    shotsThisWeek,
  });
}
