import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { beans, shots, users, grinders, machines, userBeans } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * GET /api/shares/beans/:slug — Public endpoint to fetch a bean by share slug.
 * No authentication required. Returns bean metadata and optionally creator's non-hidden shots.
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

  const beanPayload = {
    id: bean.id,
    name: bean.name,
    origin: bean.origin,
    roaster: bean.roaster,
    originId: bean.originId,
    roasterId: bean.roasterId,
    originDetails: bean.originDetails,
    processingMethod: bean.processingMethod,
    roastLevel: bean.roastLevel,
    roastDate: bean.roastDate,
    isRoastDateBestGuess: bean.isRoastDateBestGuess,
    createdBy: bean.createdBy,
    generalAccess: bean.generalAccess,
    generalAccessShareShots: bean.generalAccessShareShots,
    shareSlug: bean.shareSlug,
    createdAt: bean.createdAt,
  };

  if (!bean.generalAccessShareShots) {
    return NextResponse.json({ bean: beanPayload, shots: [] });
  }

  const beanId = bean.id;

  // User IDs who opted in to share their shots on the public page (excluding creator)
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

  const allShots: Array<{
    id: string;
    doseGrams: string | null;
    yieldGrams: string | null;
    grindLevel: string | null;
    brewTimeSecs: string | null;
    brewTempC: string | null;
    shotQuality: string | null;
    rating: string | null;
    bitter: string | null;
    sour: string | null;
    notes: string | null;
    flavors: string[] | null;
    bodyTexture: string[] | null;
    adjectives: string[] | null;
    isReferenceShot: boolean;
    createdAt: Date;
    userName: string | null;
    userImage: string | null;
    grinderName: string | null;
    machineName: string | null;
  }> = [];

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

  const creatorShots = await db
    .select(shotSelect)
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(
      and(
        eq(shots.beanId, beanId),
        eq(shots.userId, bean.createdBy),
        eq(shots.isHidden, false),
      ),
    )
    .orderBy(desc(shots.createdAt))
    .limit(100);

  allShots.push(...creatorShots);

  if (optedInUserIds.length > 0) {
    const contributorShots = await db
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

    allShots.push(...contributorShots);
  }

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
