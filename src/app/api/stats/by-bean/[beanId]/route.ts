import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans } from "@/db/schema";
import { eq, count, avg } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ beanId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { beanId } = await params;

  // Get bean info
  const [bean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, beanId))
    .limit(1);

  if (!bean) {
    return NextResponse.json({ error: "Bean not found" }, { status: 404 });
  }

  // Get shot stats for this bean
  const beanShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      shotQuality: shots.shotQuality,
      flavorProfile: shots.flavorProfile,
      brewTimeSecs: shots.brewTimeSecs,
      grindLevel: shots.grindLevel,
      createdAt: shots.createdAt,
    })
    .from(shots)
    .where(eq(shots.beanId, beanId));

  const shotCount = beanShots.length;

  // Average quality
  const avgQuality = shotCount > 0
    ? parseFloat(
        (beanShots.reduce((acc, s) => acc + s.shotQuality, 0) / shotCount).toFixed(1)
      )
    : null;

  // Average brew ratio
  const ratios = beanShots
    .map((s) => {
      const dose = parseFloat(s.doseGrams);
      const yieldG = parseFloat(s.yieldGrams);
      return dose > 0 ? yieldG / dose : null;
    })
    .filter((r): r is number => r !== null);
  const avgBrewRatio = ratios.length > 0
    ? parseFloat((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2))
    : null;

  // Common flavors (frequency count)
  const flavorCounts: Record<string, number> = {};
  for (const s of beanShots) {
    if (s.flavorProfile && Array.isArray(s.flavorProfile)) {
      for (const f of s.flavorProfile) {
        flavorCounts[f] = (flavorCounts[f] || 0) + 1;
      }
    }
  }
  const commonFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([flavor, count]) => ({ flavor, count }));

  // Average brew time
  const avgBrewTime = shotCount > 0
    ? parseFloat(
        (beanShots.reduce((acc, s) => acc + parseFloat(s.brewTimeSecs), 0) / shotCount).toFixed(1)
      )
    : null;

  // Average grind level
  const avgGrindLevel = shotCount > 0
    ? parseFloat(
        (beanShots.reduce((acc, s) => acc + parseFloat(s.grindLevel), 0) / shotCount).toFixed(2)
      )
    : null;

  return NextResponse.json({
    bean: {
      id: bean.id,
      name: bean.name,
      roastLevel: bean.roastLevel,
      origin: bean.origin,
      roaster: bean.roaster,
    },
    shotCount,
    avgQuality,
    avgBrewRatio,
    avgBrewTime,
    avgGrindLevel,
    commonFlavors,
  });
}
