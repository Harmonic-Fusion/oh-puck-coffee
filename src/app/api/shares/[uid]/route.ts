import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/shares/:uid — Public endpoint to fetch a shared shot by share_slug.
 * No authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  const [result] = await db
    .select({
      id: shots.id,
      userName: users.name,
      userImage: users.image,
      beanName: beans.name,
      beanRoastLevel: beans.roastLevel,
      beanRoastDate: beans.roastDate,
      grinderName: grinders.name,
      machineName: machines.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      brewPressure: shots.brewPressure,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
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
      createdAt: shots.createdAt,
    })
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(eq(shots.shareSlug, uid))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  // Compute derived fields
  const dose = result.doseGrams ? parseFloat(result.doseGrams) : null;
  const yieldG = result.yieldGrams ? parseFloat(result.yieldGrams) : null;
  const brewRatio =
    dose !== null && yieldG !== null && dose > 0
      ? parseFloat((yieldG / dose).toFixed(2))
      : null;

  let daysPostRoast: number | null = null;
  if (result.beanRoastDate) {
    const shotDate = new Date(result.createdAt);
    const roastDate = new Date(result.beanRoastDate);
    daysPostRoast = Math.floor(
      (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return NextResponse.json({
    ...result,
    brewRatio,
    daysPostRoast,
    shareId: uid,
  });
}

/**
 * DELETE /api/shares/:uid — Remove share link for a shot (clears shots.share_slug).
 * Requires authentication; only the shot owner can remove the share.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { getSession } = await import("@/auth");
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  const [shot] = await db
    .select({ id: shots.id, userId: shots.userId })
    .from(shots)
    .where(eq(shots.shareSlug, uid))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  if (shot.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(shots)
    .set({ shareSlug: null, updatedAt: new Date() })
    .where(eq(shots.id, shot.id));

  return new Response(null, { status: 204 });
}
