import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shotShares, shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/shares/:uid — Public endpoint to fetch a shared shot.
 * No authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  // Look up the share
  const [share] = await db
    .select()
    .from(shotShares)
    .where(eq(shotShares.id, uid))
    .limit(1);

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Fetch the shot with related data
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
    .where(eq(shots.id, share.shotId))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  // Compute derived fields
  const dose = parseFloat(result.doseGrams);
  const yieldG = parseFloat(result.yieldGrams);
  const brewRatio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;

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
