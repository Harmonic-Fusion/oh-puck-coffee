import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans, users, beansShare } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { canAccessBean } from "@/lib/beans-access";

/**
 * GET /api/beans/:id/shots
 *
 * Returns all shots for this bean that the authenticated user has permission to see:
 *   - The user's own shots (always included, including hidden ones)
 *   - Shots from other members with status owner/accepted/self and shotHistoryAccess:
 *     - none: never include
 *     - restricted: include (caller is a bean member, so "only other members" = include)
 *     - anyone_with_link: include (caller is authenticated)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: beanId } = await params;

  const result = await canAccessBean(
    session.user.id,
    beanId,
    session.user.role as "member" | "admin" | "super-admin",
  );

  if (!result.allowed) {
    return result.error;
  }

  const shotSelect = {
    id: shots.id,
    userId: shots.userId,
    userName: users.name,
    userImage: users.image,
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
    beanRoastDate: beans.roastDate,
  };

  // Always fetch the current user's own shots (including hidden)
  const myShots = await db
    .select(shotSelect)
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .where(and(eq(shots.beanId, beanId), eq(shots.userId, session.user.id)))
    .orderBy(desc(shots.createdAt))
    .limit(500);

  // Find members who share shot history: none = never; restricted = only other bean members;
  // anyone_with_link = authenticated; public = always. Caller is a member, so include restricted+.
  const sharingMembers = await db
    .select({
      userId: beansShare.userId,
      userName: users.name,
    })
    .from(beansShare)
    .leftJoin(users, eq(beansShare.userId, users.id))
    .where(
      and(
        eq(beansShare.beanId, beanId),
        inArray(beansShare.status, ["accepted", "owner", "self"]),
        inArray(beansShare.shotHistoryAccess, [
          "restricted",
          "anyone_with_link",
        ]),
      ),
    );

  const allShots = [...myShots];

  const sharerIds = sharingMembers
    .map((m) => m.userId)
    .filter((id) => id !== session.user.id);

  if (sharerIds.length > 0) {
    const sharedShots = await db
      .select(shotSelect)
      .from(shots)
      .leftJoin(users, eq(shots.userId, users.id))
      .leftJoin(beans, eq(shots.beanId, beans.id))
      .where(
        and(
          eq(shots.beanId, beanId),
          inArray(shots.userId, sharerIds),
          eq(shots.isHidden, false),
        ),
      )
      .orderBy(desc(shots.createdAt))
      .limit(500);
    allShots.push(...sharedShots);
  }

  // Enrich with computed fields and sort by date
  const enriched = allShots
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((row) => {
      const dose = row.doseGrams ? parseFloat(row.doseGrams) : null;
      const yieldG = row.yieldGrams ? parseFloat(row.yieldGrams) : null;
      const brewRatio =
        dose !== null && yieldG !== null && dose > 0
          ? parseFloat((yieldG / dose).toFixed(2))
          : null;

      let daysPostRoast: number | null = null;
      if (row.beanRoastDate) {
        const shotDate = new Date(row.createdAt);
        const roastDate = new Date(row.beanRoastDate);
        daysPostRoast = Math.floor(
          (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        userImage: row.userImage,
        doseGrams: row.doseGrams,
        yieldGrams: row.yieldGrams,
        grindLevel: row.grindLevel,
        brewTimeSecs: row.brewTimeSecs,
        brewTempC: row.brewTempC,
        preInfusionDuration: row.preInfusionDuration,
        preInfusionWaitDuration: row.preInfusionWaitDuration,
        brewPressure: row.brewPressure,
        flowRate: row.flowRate,
        shotQuality: row.shotQuality,
        rating: row.rating,
        bitter: row.bitter,
        sour: row.sour,
        notes: row.notes,
        flavors: row.flavors,
        bodyTexture: row.bodyTexture,
        adjectives: row.adjectives,
        isReferenceShot: row.isReferenceShot,
        isHidden: row.isHidden,
        createdAt: row.createdAt,
        brewRatio,
        daysPostRoast,
      };
    });

  // Build the list of unique contributors for the UI
  const contributorMap = new Map<
    string,
    {
      userId: string;
      userName: string | null;
      userImage: string | null;
      isCurrentUser: boolean;
    }
  >();
  contributorMap.set(session.user.id, {
    userId: session.user.id,
    userName: session.user.name ?? null,
    userImage: session.user.image ?? null,
    isCurrentUser: true,
  });
  for (const m of sharingMembers) {
    if (m.userId !== session.user.id) {
      contributorMap.set(m.userId, {
        userId: m.userId,
        userName: m.userName ?? null,
        userImage: null,
        isCurrentUser: false,
      });
    }
  }

  return NextResponse.json({
    shots: enriched,
    contributors: Array.from(contributorMap.values()),
  });
}
