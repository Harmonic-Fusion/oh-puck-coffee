import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, shots, beansShare } from "@/db/schema";
import { eq, and, count, inArray, or } from "drizzle-orm";

/**
 * GET /api/shares/beans/:slug/stats — Public stats for a shared bean.
 * No auth required when bean is public or anyone_with_link.
 * Unauthenticated: stats from members with shot_history_access = 'anyone_with_link' only.
 * Authenticated: stats from members with 'anyone_with_link' or 'restricted'.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await getSession();
  const isAuthenticated = Boolean(session?.user?.id);

  const [bean] = await db
    .select()
    .from(beans)
    .where(eq(beans.shareSlug, slug))
    .limit(1);

  if (!bean) {
    return NextResponse.json({ error: "Bean not found" }, { status: 404 });
  }

  if (bean.generalAccess === "restricted") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const beanId = bean.id;

  const followerResult = await db
    .select({ count: count() })
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, beanId),
        inArray(beansShare.status, ["accepted", "self"]),
      ),
    );
  const followerCount = followerResult[0]?.count ?? 0;

  const optedInRows = await db
    .select({ userId: beansShare.userId })
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, beanId),
        inArray(beansShare.status, ["owner", "accepted", "self"]),
        isAuthenticated
          ? or(
              eq(beansShare.shotHistoryAccess, "anyone_with_link"),
              eq(beansShare.shotHistoryAccess, "restricted"),
            )
          : eq(beansShare.shotHistoryAccess, "anyone_with_link"),
      ),
    );
  const optedInUserIds = optedInRows.map((r) => r.userId);

  let beanShots: { rating: string | null; flavors: string[] | null }[] = [];
  if (optedInUserIds.length > 0) {
    beanShots = await db
      .select({ rating: shots.rating, flavors: shots.flavors })
      .from(shots)
      .where(
        and(
          eq(shots.beanId, beanId),
          inArray(shots.userId, optedInUserIds),
          eq(shots.isHidden, false),
        ),
      );
  }

  const shotCount = beanShots.length;

  const ratedShots = beanShots.filter((s) => s.rating != null);
  const averageRating =
    ratedShots.length > 0
      ? parseFloat(
          (
            ratedShots.reduce(
              (acc, s) => acc + parseFloat(s.rating ?? "0"),
              0,
            ) / ratedShots.length
          ).toFixed(1),
        )
      : null;

  const flavorToRatings: Record<string, number[]> = {};
  for (const s of beanShots) {
    const r = s.rating != null ? parseFloat(s.rating) : null;
    if (r === null) continue;
    const flavors = s.flavors && Array.isArray(s.flavors) ? s.flavors : [];
    for (const f of flavors) {
      if (!flavorToRatings[f]) flavorToRatings[f] = [];
      flavorToRatings[f].push(r);
    }
  }
  const flavorsByAverageRating = Object.entries(flavorToRatings)
    .map(([flavor, ratings]) => ({
      flavor,
      averageRating: parseFloat(
        (
          ratings.reduce((a, b) => a + b, 0) / ratings.length
        ).toFixed(1),
      ),
      shotCount: ratings.length,
    }))
    .sort((a, b) => b.averageRating - a.averageRating);

  return NextResponse.json({
    shotCount,
    followerCount,
    averageRating,
    flavorsByAverageRating,
  });
}
