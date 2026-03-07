import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, userBeans, beansShare, shots, shotShares } from "@/db/schema";
import { createBeanSchema } from "@/shared/beans/schema";
import { ilike, desc, eq, and, max, sql, inArray, count } from "drizzle-orm";
import { generateShortUid } from "@/lib/short-uid";

interface ShareSideLoadItem {
  id: string;
  shotId: string;
  userId: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const orderBy = searchParams.get("orderBy");
  const withCounts = searchParams.get("withCounts") === "true";
  const shareShotIds = parseShareShotIds(searchParams);

  // User sees beans they have a user_beans row for (created + shared with them)
  const searchCondition = search ? ilike(beans.name, `%${search}%`) : undefined;

  function toBeanWithUserData(
    r: {
      id: string;
      name: string;
      origin: string | null;
      roaster: string | null;
      originId: number | null;
      roasterId: number | null;
      originDetails: string | null;
      processingMethod: string | null;
      roastLevel: string;
      roastDate: Date | null;
      isRoastDateBestGuess: boolean;
      createdBy: string;
      generalAccess: "restricted" | "anyone_with_link" | "public";
      generalAccessShareShots: boolean;
      shareSlug: string | null;
      createdAt: Date;
      openBagDate: Date | null;
      userBeanCreatedAt: Date;
      beanId: string;
      userId: string;
      shareMyShotsPublicly?: boolean;
    } & Record<string, unknown>,
  ) {
    const { openBagDate, userBeanCreatedAt, beanId, userId, shareMyShotsPublicly = false, ...rest } = r;
    return {
      ...rest,
      userBean: {
        beanId,
        userId,
        openBagDate,
        shareMyShotsPublicly,
        createdAt: userBeanCreatedAt,
      },
    };
  }

  // If ordering by recent usage, join with shots and order by max createdAt
  if (orderBy === "recent") {
    const joinCondition =
      session.user.role !== "admin"
        ? and(eq(shots.beanId, beans.id), eq(shots.userId, session.user.id))
        : eq(shots.beanId, beans.id);

    const results = await db
      .select({
        id: beans.id,
        name: beans.name,
        origin: beans.origin,
        roaster: beans.roaster,
        originId: beans.originId,
        roasterId: beans.roasterId,
        originDetails: beans.originDetails,
        processingMethod: beans.processingMethod,
        roastLevel: beans.roastLevel,
        roastDate: beans.roastDate,
        isRoastDateBestGuess: beans.isRoastDateBestGuess,
        createdBy: beans.createdBy,
        generalAccess: beans.generalAccess,
        generalAccessShareShots: beans.generalAccessShareShots,
        shareSlug: beans.shareSlug,
        createdAt: beans.createdAt,
        openBagDate: userBeans.openBagDate,
        userBeanCreatedAt: userBeans.createdAt,
        beanId: userBeans.beanId,
        userId: userBeans.userId,
        shareMyShotsPublicly: userBeans.shareMyShotsPublicly,

        lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
      })
      .from(beans)
      .innerJoin(
        userBeans,
        and(
          eq(beans.id, userBeans.beanId),
          eq(userBeans.userId, session.user.id),
        ),
      )
      .leftJoin(shots, joinCondition)
      .where(searchCondition)
      .groupBy(
        beans.id,
        beans.name,
        beans.origin,
        beans.roaster,
        beans.originId,
        beans.roasterId,
        beans.originDetails,
        beans.processingMethod,
        beans.roastLevel,
        beans.roastDate,
        beans.isRoastDateBestGuess,
        beans.createdBy,
        beans.generalAccess,
        beans.generalAccessShareShots,
        beans.shareSlug,
        beans.createdAt,
        userBeans.openBagDate,
        userBeans.createdAt,
        userBeans.beanId,
        userBeans.userId,
        userBeans.shareMyShotsPublicly,

      )
      .orderBy(desc(sql`max(${shots.createdAt})`), desc(beans.createdAt));

    const share = await getShareSideLoad(shareShotIds, session.user.id);
    if (!share) {
      return NextResponse.json(results.map(toBeanWithUserData));
    }
    return NextResponse.json({ data: results.map(toBeanWithUserData), share });
  }

  // If ordering by best rating, join with shots and order by max rating
  if (orderBy === "bestRating") {
    const joinCondition =
      session.user.role !== "admin"
        ? and(
            eq(shots.beanId, beans.id),
            eq(shots.userId, session.user.id),
            eq(shots.isHidden, false),
          )
        : and(eq(shots.beanId, beans.id), eq(shots.isHidden, false));

    const results = await db
      .select({
        id: beans.id,
        name: beans.name,
        origin: beans.origin,
        roaster: beans.roaster,
        originId: beans.originId,
        roasterId: beans.roasterId,
        originDetails: beans.originDetails,
        processingMethod: beans.processingMethod,
        roastLevel: beans.roastLevel,
        roastDate: beans.roastDate,
        isRoastDateBestGuess: beans.isRoastDateBestGuess,
        createdBy: beans.createdBy,
        generalAccess: beans.generalAccess,
        generalAccessShareShots: beans.generalAccessShareShots,
        shareSlug: beans.shareSlug,
        createdAt: beans.createdAt,
        openBagDate: userBeans.openBagDate,
        userBeanCreatedAt: userBeans.createdAt,
        beanId: userBeans.beanId,
        userId: userBeans.userId,
        shareMyShotsPublicly: userBeans.shareMyShotsPublicly,

        bestRating: sql<
          number | null
        >`max(${shots.rating}) filter (where ${shots.rating} is not null)`.as(
          "bestRating",
        ),
      })
      .from(beans)
      .innerJoin(
        userBeans,
        and(
          eq(beans.id, userBeans.beanId),
          eq(userBeans.userId, session.user.id),
        ),
      )
      .leftJoin(shots, joinCondition)
      .where(searchCondition)
      .groupBy(
        beans.id,
        beans.name,
        beans.origin,
        beans.roaster,
        beans.originId,
        beans.roasterId,
        beans.originDetails,
        beans.processingMethod,
        beans.roastLevel,
        beans.roastDate,
        beans.isRoastDateBestGuess,
        beans.createdBy,
        beans.generalAccess,
        beans.generalAccessShareShots,
        beans.shareSlug,
        beans.createdAt,
        userBeans.openBagDate,
        userBeans.createdAt,
        userBeans.beanId,
        userBeans.userId,
        userBeans.shareMyShotsPublicly,

      )
      .orderBy(
        desc(
          sql`max(${shots.rating}) filter (where ${shots.rating} is not null)`,
        ),
        desc(beans.createdAt),
      );

    const share = await getShareSideLoad(shareShotIds, session.user.id);
    if (!share) {
      return NextResponse.json(results.map(toBeanWithUserData));
    }
    return NextResponse.json({ data: results.map(toBeanWithUserData), share });
  }

  // withCounts=true: include shot count, last shot date, and allShotsHidden
  if (withCounts) {
    const joinCondition =
      session.user.role !== "admin"
        ? and(eq(shots.beanId, beans.id), eq(shots.userId, session.user.id))
        : eq(shots.beanId, beans.id);

    const bestRatingExpr = sql<
      number | null
    >`max(${shots.rating}) filter (where ${shots.rating} is not null and not ${shots.isHidden})`.as(
      "bestRating",
    );

    const results = await db
      .select({
        id: beans.id,
        name: beans.name,
        origin: beans.origin,
        roaster: beans.roaster,
        originId: beans.originId,
        roasterId: beans.roasterId,
        originDetails: beans.originDetails,
        processingMethod: beans.processingMethod,
        roastLevel: beans.roastLevel,
        roastDate: beans.roastDate,
        isRoastDateBestGuess: beans.isRoastDateBestGuess,
        createdBy: beans.createdBy,
        generalAccess: beans.generalAccess,
        generalAccessShareShots: beans.generalAccessShareShots,
        shareSlug: beans.shareSlug,
        createdAt: beans.createdAt,
        openBagDate: userBeans.openBagDate,
        userBeanCreatedAt: userBeans.createdAt,
        beanId: userBeans.beanId,
        userId: userBeans.userId,
        shareMyShotsPublicly: userBeans.shareMyShotsPublicly,

        shotCount: count(shots.id).as("shotCount"),
        lastShotAt: max(shots.createdAt).as("lastShotAt"),
        visibleShotCount:
          sql<number>`count(${shots.id}) filter (where not ${shots.isHidden})`.as(
            "visibleShotCount",
          ),
        bestRating: bestRatingExpr,
      })
      .from(beans)
      .innerJoin(
        userBeans,
        and(
          eq(beans.id, userBeans.beanId),
          eq(userBeans.userId, session.user.id),
        ),
      )
      .leftJoin(shots, joinCondition)
      .where(searchCondition)
      .groupBy(
        beans.id,
        beans.name,
        beans.origin,
        beans.roaster,
        beans.originId,
        beans.roasterId,
        beans.originDetails,
        beans.processingMethod,
        beans.roastLevel,
        beans.roastDate,
        beans.isRoastDateBestGuess,
        beans.createdBy,
        beans.generalAccess,
        beans.generalAccessShareShots,
        beans.shareSlug,
        beans.createdAt,
        userBeans.openBagDate,
        userBeans.createdAt,
        userBeans.beanId,
        userBeans.userId,
        userBeans.shareMyShotsPublicly,

      )
      .orderBy(
        orderBy === "bestRating"
          ? desc(
              sql`max(${shots.rating}) filter (where ${shots.rating} is not null and not ${shots.isHidden})`,
            )
          : desc(beans.createdAt),
        desc(beans.createdAt),
      );

    const beanIds = results.map((r) => r.id);
    const avgRatings = new Map<string, number | null>();
    const commonFlavorsMap = new Map<string, string[]>();

    if (beanIds.length > 0) {
      const ratingResults = await db
        .select({
          beanId: shots.beanId,
          avgRating:
            sql<number>`avg(${shots.rating}) filter (where ${shots.rating} is not null)`.as(
              "avgRating",
            ),
        })
        .from(shots)
        .where(
          and(
            inArray(shots.beanId, beanIds),
            session.user.role !== "admin" && session.user.role !== "super-admin"
              ? eq(shots.userId, session.user.id)
              : undefined,
            eq(shots.isHidden, false),
          ),
        )
        .groupBy(shots.beanId);

      for (const row of ratingResults) {
        avgRatings.set(
          row.beanId,
          row.avgRating ? parseFloat(Number(row.avgRating).toFixed(1)) : null,
        );
      }

      const flavorShots = await db
        .select({
          beanId: shots.beanId,
          flavors: shots.flavors,
        })
        .from(shots)
        .where(
          and(
            inArray(shots.beanId, beanIds),
            session.user.role !== "admin" && session.user.role !== "super-admin"
              ? eq(shots.userId, session.user.id)
              : undefined,
            eq(shots.isHidden, false),
          ),
        );

      const flavorCountsByBean = new Map<string, Record<string, number>>();
      for (const shot of flavorShots) {
        if (!shot.flavors || !Array.isArray(shot.flavors)) continue;
        if (!flavorCountsByBean.has(shot.beanId)) {
          flavorCountsByBean.set(shot.beanId, {});
        }
        const counts = flavorCountsByBean.get(shot.beanId)!;
        for (const flavor of shot.flavors) {
          counts[flavor] = (counts[flavor] || 0) + 1;
        }
      }

      for (const [beanId, counts] of flavorCountsByBean.entries()) {
        const topFlavors = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([flavor]) => flavor);
        commonFlavorsMap.set(beanId, topFlavors);
      }
    }

    const withHiddenFlag = results.map((r) => ({
      ...toBeanWithUserData(r),
      shotCount: Number(r.shotCount),
      lastShotAt: r.lastShotAt,
      visibleShotCount: Number(r.visibleShotCount),
      allShotsHidden:
        Number(r.shotCount) > 0 && Number(r.visibleShotCount) === 0,
      avgRating: avgRatings.get(r.id) ?? null,
      bestRating:
        r.bestRating != null
          ? parseFloat(Number(r.bestRating).toFixed(1))
          : null,
      commonFlavors: commonFlavorsMap.get(r.id) ?? [],
    }));

    return NextResponse.json(withHiddenFlag);
  }

  // Default: order by createdAt desc
  const results = await db
    .select({
      id: beans.id,
      name: beans.name,
      origin: beans.origin,
      roaster: beans.roaster,
      originId: beans.originId,
      roasterId: beans.roasterId,
      originDetails: beans.originDetails,
      processingMethod: beans.processingMethod,
      roastLevel: beans.roastLevel,
      roastDate: beans.roastDate,
      isRoastDateBestGuess: beans.isRoastDateBestGuess,
      createdBy: beans.createdBy,
      generalAccess: beans.generalAccess,
      generalAccessShareShots: beans.generalAccessShareShots,
      shareSlug: beans.shareSlug,
      createdAt: beans.createdAt,
      openBagDate: userBeans.openBagDate,
      userBeanCreatedAt: userBeans.createdAt,
      beanId: userBeans.beanId,
      userId: userBeans.userId,
      shareMyShotsPublicly: userBeans.shareMyShotsPublicly,
    })
    .from(beans)
    .innerJoin(
      userBeans,
      and(
        eq(beans.id, userBeans.beanId),
        eq(userBeans.userId, session.user.id),
      ),
    )
    .where(searchCondition)
    .orderBy(desc(beans.createdAt));

  const share = await getShareSideLoad(shareShotIds, session.user.id);
  if (!share) {
    return NextResponse.json(results.map(toBeanWithUserData));
  }
  return NextResponse.json({ data: results.map(toBeanWithUserData), share });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBeanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { openBagDate, ...beanData } = parsed.data;

  const [bean] = await db
    .insert(beans)
    .values({
      ...beanData,
      createdBy: session.user.id,
    })
    .returning();

  if (!bean) {
    return NextResponse.json(
      { error: "Failed to create bean" },
      { status: 500 },
    );
  }

  const [userBeanRow] = await db
    .insert(userBeans)
    .values({
      beanId: bean.id,
      userId: session.user.id,
      openBagDate: openBagDate ?? null,
    })
    .returning();

  // Create the owner's membership row in beansShare. invitedBy = null (no inviter),
  // reshareEnabled = true (owner can always reshare), shareShotHistory = false (opt-in).
  await db.insert(beansShare).values({
    beanId: bean.id,
    userId: session.user.id,
    invitedBy: null,
    status: "accepted",
    shareShotHistory: false,
    reshareEnabled: true,
  });

  const userBean = userBeanRow
    ? {
        beanId: userBeanRow.beanId,
        userId: userBeanRow.userId,
        openBagDate: userBeanRow.openBagDate,
        shareMyShotsPublicly: userBeanRow.shareMyShotsPublicly,
        createdAt: userBeanRow.createdAt,
      }
    : null;

  return NextResponse.json({ ...bean, userBean }, { status: 201 });
}

function parseShareShotIds(searchParams: URLSearchParams): string[] {
  const rawShareParams = searchParams.getAll("share");
  if (rawShareParams.length === 0) {
    return [];
  }

  const ids = new Set<string>();
  for (const rawValue of rawShareParams) {
    const parts = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    for (const id of parts) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

async function getShareSideLoad(
  shareShotIds: string[],
  userId: string,
): Promise<ShareSideLoadItem[] | null> {
  if (shareShotIds.length === 0) {
    return null;
  }

  const userShots = await db
    .select({ id: shots.id })
    .from(shots)
    .where(and(inArray(shots.id, shareShotIds), eq(shots.userId, userId)));

  const allowedShotIds = userShots.map((shot) => shot.id);
  if (allowedShotIds.length === 0) {
    return [];
  }

  const existingShares = await db
    .select({
      id: shotShares.id,
      shotId: shotShares.shotId,
      userId: shotShares.userId,
      createdAt: shotShares.createdAt,
    })
    .from(shotShares)
    .where(
      and(
        inArray(shotShares.shotId, allowedShotIds),
        eq(shotShares.userId, userId),
      ),
    );

  const existingByShotId = new Map(
    existingShares.map((share) => [share.shotId, share]),
  );
  const missingShotIds = allowedShotIds.filter(
    (shotId) => !existingByShotId.has(shotId),
  );

  let createdShares: ShareSideLoadItem[] = [];
  if (missingShotIds.length > 0) {
    createdShares = await db
      .insert(shotShares)
      .values(
        missingShotIds.map((shotId) => ({
          id: generateShortUid(),
          shotId,
          userId,
        })),
      )
      .returning({
        id: shotShares.id,
        shotId: shotShares.shotId,
        userId: shotShares.userId,
        createdAt: shotShares.createdAt,
      });
  }

  return [...existingShares, ...createdShares];
}
