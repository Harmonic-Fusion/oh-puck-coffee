import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, shots, shotShares } from "@/db/schema";
import { createBeanSchema } from "@/shared/beans/schema";
import { ilike, desc, eq, and, max, sql, inArray } from "drizzle-orm";
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
  const shareShotIds = parseShareShotIds(searchParams);

  // Members can only see beans they created, admins can see all
  const beanConditions = [];
  if (session.user.role !== "admin") {
    beanConditions.push(eq(beans.userId, session.user.id));
  }
  if (search) {
    beanConditions.push(ilike(beans.name, `%${search}%`));
  }

  const beanWhereClause =
    beanConditions.length > 0 ? and(...beanConditions) : undefined;

  // If ordering by recent usage, join with shots and order by max createdAt
  if (orderBy === "recent") {
    // Members can only see their own shots, admins see all shots
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
        openBagDate: beans.openBagDate,
        isRoastDateBestGuess: beans.isRoastDateBestGuess,
        userId: beans.userId,
        createdAt: beans.createdAt,
        lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
      })
      .from(beans)
      .leftJoin(shots, joinCondition)
      .where(beanWhereClause)
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
        beans.openBagDate,
        beans.isRoastDateBestGuess,
        beans.userId,
        beans.createdAt
      )
      .orderBy(desc(sql`max(${shots.createdAt})`), desc(beans.createdAt));

    const share = await getShareSideLoad(shareShotIds, session.user.id);
    if (!share) {
      return NextResponse.json(results);
    }
    return NextResponse.json({ data: results, share });
  }

  // Default: order by createdAt desc
  const results = await db
    .select()
    .from(beans)
    .where(beanWhereClause)
    .orderBy(desc(beans.createdAt));

  const share = await getShareSideLoad(shareShotIds, session.user.id);
  if (!share) {
    return NextResponse.json(results);
  }
  return NextResponse.json({ data: results, share });
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
      { status: 400 }
    );
  }

  const [bean] = await db
    .insert(beans)
    .values({
      ...parsed.data,
      userId: session.user.id,
    })
    .returning();

  return NextResponse.json(bean, { status: 201 });
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
  userId: string
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
        eq(shotShares.userId, userId)
      )
    );

  const existingByShotId = new Map(
    existingShares.map((share) => [share.shotId, share])
  );
  const missingShotIds = allowedShotIds.filter(
    (shotId) => !existingByShotId.has(shotId)
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
        }))
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
