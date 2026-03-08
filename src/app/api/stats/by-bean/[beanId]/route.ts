import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, origins, roasters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessBean } from "@/lib/beans-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ beanId: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { beanId } = await params;

  const result = await canAccessBean(
    session.user.id,
    beanId,
    session.user.role,
  );

  if (!result.allowed) {
    return result.error;
  }

  const { bean } = result;

  const shotConditions = [
    eq(shots.beanId, beanId),
    eq(shots.isHidden, false),
  ];
  if (session.user.role !== "admin") {
    shotConditions.push(eq(shots.userId, session.user.id));
  }

  const beanShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      shotQuality: shots.shotQuality,
      rating: shots.rating,
      flavors: shots.flavors,
      bodyTexture: shots.bodyTexture,
      adjectives: shots.adjectives,
      brewTimeSecs: shots.brewTimeSecs,
      grindLevel: shots.grindLevel,
      createdAt: shots.createdAt,
    })
    .from(shots)
    .where(and(...shotConditions));

  const shotCount = beanShots.length;

  // Average quality (only where shotQuality is not null)
  const qualityShots = beanShots.filter((s) => s.shotQuality != null);
  const avgQuality = qualityShots.length > 0
    ? parseFloat(
        (qualityShots.reduce((acc, s) => acc + parseFloat(s.shotQuality ?? "0"), 0) / qualityShots.length).toFixed(1)
      )
    : null;

  // Average rating (only where rating is not null)
  const ratedShots = beanShots.filter((s) => s.rating != null);
  const avgRating = ratedShots.length > 0
    ? parseFloat(
        (ratedShots.reduce((acc, s) => acc + parseFloat(s.rating ?? "0"), 0) / ratedShots.length).toFixed(1)
      )
    : null;

  // Average brew ratio
  const ratios = beanShots
    .map((s) => {
      if (!s.doseGrams || !s.yieldGrams) return null;
      const dose = parseFloat(s.doseGrams);
      const yieldG = parseFloat(s.yieldGrams);
      return dose > 0 ? yieldG / dose : null;
    })
    .filter((r): r is number => r !== null);
  const avgBrewRatio = ratios.length > 0
    ? parseFloat((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2))
    : null;

  // Common flavors (from flavor wheel categories)
  const flavorCounts: Record<string, number> = {};
  for (const s of beanShots) {
    if (s.flavors && Array.isArray(s.flavors)) {
      for (const f of s.flavors) {
        // Extract leaf name from path
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
        (beanShots.reduce((acc, s) => acc + parseFloat(s.brewTimeSecs ?? "0"), 0) / shotCount).toFixed(1)
      )
    : null;

  // Average grind level
  const avgGrindLevel = shotCount > 0
    ? parseFloat(
        (beanShots.reduce((acc, s) => acc + parseFloat(s.grindLevel ?? "0"), 0) / shotCount).toFixed(2)
      )
    : null;

  let originName: string | null = null;
  let roasterName: string | null = null;
  if (bean.originId || bean.roasterId) {
    const [o] = bean.originId
      ? await db.select({ name: origins.name }).from(origins).where(eq(origins.id, bean.originId!)).limit(1)
      : [null];
    const [r] = bean.roasterId
      ? await db.select({ name: roasters.name }).from(roasters).where(eq(roasters.id, bean.roasterId!)).limit(1)
      : [null];
    originName = o?.name ?? null;
    roasterName = r?.name ?? null;
  }

  return NextResponse.json({
    bean: {
      id: bean.id,
      name: bean.name,
      roastLevel: bean.roastLevel,
      origin: originName,
      roaster: roasterName,
    },
    shotCount,
    avgQuality,
    avgRating,
    avgBrewRatio,
    avgBrewTime,
    avgGrindLevel,
    commonFlavors,
  });
}
