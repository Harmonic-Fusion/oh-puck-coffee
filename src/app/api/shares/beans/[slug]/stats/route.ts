import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { beans, shots, userBeans } from "@/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

/**
 * GET /api/shares/beans/:slug/stats — Public stats for a shared bean.
 * No auth required when bean is public or anyone_with_link.
 * Returns shotCount, followerCount, averageRating, flavorsByAverageRating.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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

  // Follower count = number of user_beans rows for this bean
  const [followerResult] = await db
    .select({ count: count() })
    .from(userBeans)
    .where(eq(userBeans.beanId, beanId));
  const followerCount = followerResult?.count ?? 0;

  if (!bean.generalAccessShareShots) {
    return NextResponse.json({
      shotCount: 0,
      followerCount,
      averageRating: null,
      flavorsByAverageRating: [],
    });
  }

  const optedInRows = await db
    .select({ userId: userBeans.userId })
    .from(userBeans)
    .where(
      and(
        eq(userBeans.beanId, beanId),
        eq(userBeans.shareMyShotsPublicly, true),
      ),
    );
  const optedInUserIds = optedInRows
    .map((r) => r.userId)
    .filter((id) => id !== bean.createdBy);

  const creatorShots = await db
    .select({ rating: shots.rating, flavors: shots.flavors })
    .from(shots)
    .where(
      and(
        eq(shots.beanId, beanId),
        eq(shots.userId, bean.createdBy),
        eq(shots.isHidden, false),
      ),
    );

  let contributorShots: { rating: string | null; flavors: string[] | null }[] = [];
  if (optedInUserIds.length > 0) {
    contributorShots = await db
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

  const beanShots = [...creatorShots, ...contributorShots];

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

  // Per-flavor average rating: for each flavor present in shots, average the shot's rating
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
