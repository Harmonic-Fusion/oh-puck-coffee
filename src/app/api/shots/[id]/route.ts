import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [result] = await db
    .select({
      id: shots.id,
      userId: shots.userId,
      userName: users.name,
      beanId: shots.beanId,
      beanName: beans.name,
      beanRoastLevel: beans.roastLevel,
      beanRoastDate: beans.roastDate,
      grinderId: shots.grinderId,
      grinderName: grinders.name,
      machineId: shots.machineId,
      machineName: machines.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      flowRate: shots.flowRate,
      shotQuality: shots.shotQuality,
      flavorProfile: shots.flavorProfile,
      toolsUsed: shots.toolsUsed,
      notes: shots.notes,
      flavorWheelCategories: shots.flavorWheelCategories,
      flavorWheelBody: shots.flavorWheelBody,
      flavorWheelAdjectives: shots.flavorWheelAdjectives,
      overallPreference: shots.overallPreference,
      isReferenceShot: shots.isReferenceShot,
      createdAt: shots.createdAt,
      updatedAt: shots.updatedAt,
    })
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(eq(shots.id, id))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  // Compute derived fields on read
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
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [shot] = await db
    .select()
    .from(shots)
    .where(eq(shots.id, id))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  if (shot.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(shots).where(eq(shots.id, id));
  return NextResponse.json({ success: true });
}
