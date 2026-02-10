import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, users, beans } from "@/db/schema";
import { eq, sql, count, and } from "drizzle-orm";
import { validateMemberAccess } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // Check if member can access this user's stats
  const accessError = validateMemberAccess(
    session.user.id,
    userId,
    session.user.role
  );
  if (accessError) return accessError;

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get shot stats for this user (excluding hidden)
  const userShots = await db
    .select({
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      shotQuality: shots.shotQuality,
      flavorWheelCategories: shots.flavorWheelCategories,
      brewTimeSecs: shots.brewTimeSecs,
      grindLevel: shots.grindLevel,
      createdAt: shots.createdAt,
    })
    .from(shots)
    .where(and(eq(shots.userId, userId), eq(shots.isHidden, false)));

  const shotCount = userShots.length;

  // Average quality
  const avgQuality = shotCount > 0
    ? parseFloat(
        (userShots.reduce((acc, s) => acc + s.shotQuality, 0) / shotCount).toFixed(1)
      )
    : null;

  // Average brew ratio
  const ratios = userShots
    .map((s) => {
      const dose = parseFloat(s.doseGrams);
      const yieldG = parseFloat(s.yieldGrams);
      return dose > 0 ? yieldG / dose : null;
    })
    .filter((r): r is number => r !== null);
  const avgBrewRatio = ratios.length > 0
    ? parseFloat((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2))
    : null;

  // Most-used bean (excluding hidden)
  const [mostUsedBean] = await db
    .select({
      beanId: shots.beanId,
      beanName: beans.name,
      count: count(),
    })
    .from(shots)
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .where(and(eq(shots.userId, userId), eq(shots.isHidden, false)))
    .groupBy(shots.beanId, beans.name)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  // Common flavors (from flavor wheel categories)
  const flavorCounts: Record<string, number> = {};
  for (const s of userShots) {
    if (s.flavorWheelCategories && typeof s.flavorWheelCategories === "object") {
      const categories = s.flavorWheelCategories as Record<string, string[]>;
      for (const [, flavors] of Object.entries(categories)) {
        for (const f of flavors) {
          flavorCounts[f] = (flavorCounts[f] || 0) + 1;
        }
      }
    }
  }
  const commonFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([flavor, count]) => ({ flavor, count }));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
    },
    shotCount,
    avgQuality,
    avgBrewRatio,
    mostUsedBean: mostUsedBean
      ? { id: mostUsedBean.beanId, name: mostUsedBean.beanName, shotCount: mostUsedBean.count }
      : null,
    commonFlavors,
  });
}
