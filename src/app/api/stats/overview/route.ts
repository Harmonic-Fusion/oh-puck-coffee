import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans } from "@/db/schema";
import { eq, sql, gte, count, avg, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Total shots (excluding hidden)
  const [totalResult] = await db
    .select({ count: count() })
    .from(shots)
    .where(eq(shots.isHidden, false));
  const totalShots = totalResult.count;

  // Average quality (excluding hidden)
  const [avgQualityResult] = await db
    .select({ avg: avg(shots.shotQuality) })
    .from(shots)
    .where(eq(shots.isHidden, false));
  const avgQuality = avgQualityResult.avg
    ? parseFloat(parseFloat(avgQualityResult.avg).toFixed(1))
    : null;

  // Average brew ratio (computed from dose/yield, excluding hidden)
  const allShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
    })
    .from(shots)
    .where(eq(shots.isHidden, false));

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

  // Most-used bean (excluding hidden)
  const [mostUsedBean] = await db
    .select({
      beanId: shots.beanId,
      beanName: beans.name,
      count: count(),
    })
    .from(shots)
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .where(eq(shots.isHidden, false))
    .groupBy(shots.beanId, beans.name)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  // Shots this week (excluding hidden)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const [weekResult] = await db
    .select({ count: count() })
    .from(shots)
    .where(and(gte(shots.createdAt, oneWeekAgo), eq(shots.isHidden, false)));
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
