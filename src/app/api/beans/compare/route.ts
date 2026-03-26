import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, shots, origins, roasters } from "@/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const beanIdsParam = searchParams.get("beanIds");
  if (!beanIdsParam) {
    return NextResponse.json({ error: "beanIds parameter is required" }, { status: 400 });
  }

  const beanIds = beanIdsParam.split(",").filter(Boolean);
  if (beanIds.length === 0) {
    return NextResponse.json({ error: "At least one bean ID is required" }, { status: 400 });
  }
  if (beanIds.length > 5) {
    return NextResponse.json({ error: "Maximum 5 beans can be compared at once" }, { status: 400 });
  }

  const beanRows = await db
    .select({
      id: beans.id,
      name: beans.name,
      originId: beans.originId,
      roasterId: beans.roasterId,
      originName: origins.name,
      roasterName: roasters.name,
      originDetails: beans.originDetails,
      processingMethod: beans.processingMethod,
      roastLevel: beans.roastLevel,
      roastDate: beans.roastDate,
      isRoastDateBestGuess: beans.isRoastDateBestGuess,
      createdAt: beans.createdAt,
      beansOpenDate: beansShare.beansOpenDate,
      userBeanCreatedAt: beansShare.createdAt,
      beanId: beansShare.beanId,
      userId: beansShare.userId,
      shotHistoryAccess: beansShare.shotHistoryAccess,
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
    .leftJoin(origins, eq(beans.originId, origins.id))
    .leftJoin(roasters, eq(beans.roasterId, roasters.id))
    .where(inArray(beans.id, beanIds));

  if (beanRows.length === 0) {
    return NextResponse.json({ beans: [] });
  }

  const shotSelect = {
    id: shots.id,
    beanId: shots.beanId,
    doseGrams: shots.doseGrams,
    yieldGrams: shots.yieldGrams,
    grindLevel: shots.grindLevel,
    brewTimeSecs: shots.brewTimeSecs,
    brewTempC: shots.brewTempC,
    preInfusionDuration: shots.preInfusionDuration,
    preInfusionWaitDuration: shots.preInfusionWaitDuration,
    brewPressure: shots.brewPressure,
    flowRate: shots.flowRate,
    shotQuality: shots.shotQuality,
    rating: shots.rating,
    bitter: shots.bitter,
    sour: shots.sour,
    notes: shots.notes,
    flavors: shots.flavors,
    bodyTexture: shots.bodyTexture,
    adjectives: shots.adjectives,
    isReferenceShot: shots.isReferenceShot,
    isHidden: shots.isHidden,
    createdAt: shots.createdAt,
  } as const;

  const isAdmin =
    session.user.role === "admin" || session.user.role === "super-admin";

  const shotRows = isAdmin
    ? await db
        .select(shotSelect)
        .from(shots)
        .where(
          and(inArray(shots.beanId, beanIds), eq(shots.isHidden, false)),
        )
        .orderBy(shots.createdAt)
    : await (async () => {
        const myShots = await db
          .select(shotSelect)
          .from(shots)
          .where(
            and(
              inArray(shots.beanId, beanIds),
              eq(shots.userId, session.user.id),
            ),
          );

        const sharingMembers = await db
          .select({
            userId: beansShare.userId,
            beanId: beansShare.beanId,
          })
          .from(beansShare)
          .where(
            and(
              inArray(beansShare.beanId, beanIds),
              inArray(beansShare.status, ["accepted", "owner", "self"]),
              inArray(beansShare.shotHistoryAccess, [
                "restricted",
                "anyone_with_link",
              ]),
            ),
          );

        const pairConditions = sharingMembers
          .filter((m) => m.userId !== session.user.id)
          .map((m) =>
            and(eq(shots.beanId, m.beanId), eq(shots.userId, m.userId)),
          );

        const sharedShots =
          pairConditions.length > 0
            ? await db
                .select(shotSelect)
                .from(shots)
                .where(and(eq(shots.isHidden, false), or(...pairConditions)))
            : [];

        return [...myShots, ...sharedShots].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime(),
        );
      })();

  // Group shots by bean and compute comparisons
  const shotsByBean = new Map<string, typeof shotRows>();
  for (const shot of shotRows) {
    const existing = shotsByBean.get(shot.beanId) ?? [];
    existing.push(shot);
    shotsByBean.set(shot.beanId, existing);
  }

  const result = beanRows.map((bean) => {
    const beanShots = shotsByBean.get(bean.id) ?? [];
    // Sorted by createdAt asc for indexing
    const sorted = [...beanShots].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Compute brewRatio and daysPostRoast per shot
    const enrichedShots = sorted.map((s, idx) => {
      const dose = s.doseGrams ? parseFloat(s.doseGrams) : null;
      const yieldG = s.yieldGrams ? parseFloat(s.yieldGrams) : null;
      const brewRatio =
        dose !== null && yieldG !== null && dose > 0
          ? parseFloat((yieldG / dose).toFixed(2))
          : null;
      let daysPostRoast: number | null = null;
      if (bean.roastDate) {
        const shotDate = new Date(s.createdAt);
        const roastDate = new Date(bean.roastDate);
        daysPostRoast = Math.floor(
          (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
      return { ...s, brewRatio, daysPostRoast, shotIndex: idx + 1 };
    });

    // Aggregate stats
    const shotCount = enrichedShots.length;
    const minShotNumber = shotCount > 0 ? 1 : 0;
    const maxShotNumber = shotCount;

    const ratedShots = enrichedShots.filter((s) => s.rating != null);
    const bestRating =
      ratedShots.length > 0
        ? Math.max(...ratedShots.map((s) => parseFloat(s.rating!)))
        : null;

    const qualityShots = enrichedShots.filter((s) => s.shotQuality != null);
    const avgQuality =
      qualityShots.length > 0
        ? parseFloat(
            (
              qualityShots.reduce((acc, s) => acc + parseFloat(s.shotQuality!), 0) /
              qualityShots.length
            ).toFixed(1),
          )
        : null;

    const avgRating =
      ratedShots.length > 0
        ? parseFloat(
            (
              ratedShots.reduce((acc, s) => acc + parseFloat(s.rating!), 0) /
              ratedShots.length
            ).toFixed(1),
          )
        : null;

    const firstShotDate = enrichedShots[0]?.createdAt ?? null;
    const lastShotDate = enrichedShots[enrichedShots.length - 1]?.createdAt ?? null;

    // Calculate flavor stats with average rating per flavor
    const flavorAgg: Record<string, { totalRating: number; count: number }> = {};
    for (const s of enrichedShots) {
      if (!s.flavors || !Array.isArray(s.flavors)) continue;
      const rating = s.rating ? parseFloat(s.rating) : null;
      if (rating === null) continue;
      for (const f of s.flavors) {
        if (!flavorAgg[f]) flavorAgg[f] = { totalRating: 0, count: 0 };
        flavorAgg[f].totalRating += rating;
        flavorAgg[f].count += 1;
      }
    }
    const flavorStats = Object.entries(flavorAgg)
      .map(([flavor, { totalRating, count }]) => ({
        flavor,
        avgRating: parseFloat((totalRating / count).toFixed(1)),
        count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    return {
      id: bean.id,
      name: bean.name,
      origin: bean.originName ?? null,
      roaster: bean.roasterName ?? null,
      originDetails: bean.originDetails,
      processingMethod: bean.processingMethod,
      roastLevel: bean.roastLevel,
      roastDate: bean.roastDate,
      isRoastDateBestGuess: bean.isRoastDateBestGuess,
      createdAt: bean.createdAt,
      userBean: {
        beanId: bean.beanId,
        userId: bean.userId,
        openBagDate: bean.beansOpenDate,
        beansOpenDate: bean.beansOpenDate,
        shotHistoryAccess: bean.shotHistoryAccess,
        createdAt: bean.userBeanCreatedAt,
      },
      shotComparisons: {
        shotCount,
        minShotNumber,
        maxShotNumber,
        bestRating,
        avgRating,
        avgQuality,
        firstShotDate,
        lastShotDate,
        flavorStats,
        shots: enrichedShots,
      },
    };
  });

  // Preserve the order requested by the client
  const orderedResult = beanIds
    .map((id) => result.find((b) => b.id === id))
    .filter(Boolean);

  return NextResponse.json({ beans: orderedResult });
}
