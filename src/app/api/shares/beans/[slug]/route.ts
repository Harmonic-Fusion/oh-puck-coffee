import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, shots, users, grinders, machines, beansShare } from "@/db/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";

/**
 * GET /api/shares/beans/:slug — Public endpoint to fetch a bean by share slug.
 * No auth required when bean is public; when bean is anyone_with_link, auth optional.
 * Returns bean metadata and shots: unauthenticated = public only; authenticated = anyone_with_link + public.
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

  const [ownerRow] = await db
    .select({ userId: beansShare.userId })
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, bean.id),
        eq(beansShare.status, "owner"),
      ),
    )
    .limit(1);

  const ownerId = ownerRow?.userId ?? null;

  const beanPayload = {
    id: bean.id,
    name: bean.name,
    originId: bean.originId,
    roasterId: bean.roasterId,
    originDetails: bean.originDetails,
    processingMethod: bean.processingMethod,
    roastLevel: bean.roastLevel,
    roastDate: bean.roastDate,
    isRoastDateBestGuess: bean.isRoastDateBestGuess,
    generalAccess: bean.generalAccess,
    shareSlug: bean.shareSlug,
    createdAt: bean.createdAt,
  };

  if (!ownerId) {
    return NextResponse.json({ bean: beanPayload, shots: [] });
  }

  const beanId = bean.id;

  // Active members who opted in to share shots on this page (anyone_with_link; no public)
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

  if (optedInUserIds.length === 0) {
    return NextResponse.json({
      bean: beanPayload,
      shots: [],
    });
  }

  const shotSelect = {
    id: shots.id,
    doseGrams: shots.doseGrams,
    yieldGrams: shots.yieldGrams,
    grindLevel: shots.grindLevel,
    brewTimeSecs: shots.brewTimeSecs,
    brewTempC: shots.brewTempC,
    shotQuality: shots.shotQuality,
    rating: shots.rating,
    bitter: shots.bitter,
    sour: shots.sour,
    notes: shots.notes,
    flavors: shots.flavors,
    bodyTexture: shots.bodyTexture,
    adjectives: shots.adjectives,
    isReferenceShot: shots.isReferenceShot,
    createdAt: shots.createdAt,
    userName: users.name,
    userImage: users.image,
    grinderName: grinders.name,
    machineName: machines.name,
  };

  const allShotsQuery = await db
    .select(shotSelect)
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(
      and(
        eq(shots.beanId, beanId),
        inArray(shots.userId, optedInUserIds),
        eq(shots.isHidden, false),
      ),
    )
    .orderBy(desc(shots.createdAt))
    .limit(100);

  const allShots = [...allShotsQuery];

  allShots.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const shotsPayload = allShots.slice(0, 100);

  return NextResponse.json({
    bean: beanPayload,
    shots: shotsPayload,
  });
}
