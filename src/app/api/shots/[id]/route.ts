import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateMemberAccess } from "@/lib/api-auth";
import { createShotSchema } from "@/shared/shots/schema";

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
      yieldActualGrams: shots.yieldActualGrams,
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
      toolsUsed: shots.toolsUsed,
      notes: shots.notes,
      flavors: shots.flavors,
      bodyTexture: shots.bodyTexture,
      adjectives: shots.adjectives,
      isReferenceShot: shots.isReferenceShot,
      isHidden: shots.isHidden,
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

  // Check if member can access this shot
  const accessError = validateMemberAccess(
    session.user.id,
    result.userId,
    session.user.role
  );
  if (accessError) return accessError;

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [existingShot] = await db
    .select()
    .from(shots)
    .where(eq(shots.id, id))
    .limit(1);

  if (!existingShot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  // Check if member can access this shot
  const accessError = validateMemberAccess(
    session.user.id,
    existingShot.userId,
    session.user.role
  );
  if (accessError) return accessError;

  const body = await request.json();
  const parsed = createShotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Compute flow rate (stored on write) - use actual yield if available, otherwise target yield
  const yieldForFlow = data.yieldActualGrams ?? data.yieldGrams;
  const flowRate =
    data.brewTimeSecs && data.brewTimeSecs > 0 && yieldForFlow
      ? parseFloat((yieldForFlow / data.brewTimeSecs).toFixed(2))
      : null;

  const [updatedShot] = await db
    .update(shots)
    .set({
      beanId: data.beanId,
      grinderId: data.grinderId,
      machineId: data.machineId || null,
      doseGrams: String(data.doseGrams),
      yieldGrams: String(data.yieldGrams),
      grindLevel: data.grindLevel ? String(data.grindLevel) : null,
      brewTempC: data.brewTempC ? String(data.brewTempC) : null,
      brewTimeSecs: data.brewTimeSecs ? String(data.brewTimeSecs) : null,
      yieldActualGrams: data.yieldActualGrams ? String(data.yieldActualGrams) : null,
      estimateMaxPressure: data.estimateMaxPressure ? String(data.estimateMaxPressure) : null,
      flowControl: data.flowControl ? String(data.flowControl) : null,
      preInfusionDuration: data.preInfusionDuration ? String(data.preInfusionDuration) : null,
      brewPressure: data.brewPressure ? String(data.brewPressure) : null,
      flowRate: flowRate ? String(flowRate) : null,
      shotQuality: String(data.shotQuality),
      rating: data.rating ? String(data.rating) : null,
        toolsUsed: data.toolsUsed || null,
        notes: data.notes || null,
        flavors: data.flavors || null,
        bodyTexture: data.bodyTexture || null,
        adjectives: data.adjectives || null,
      })
    .where(eq(shots.id, id))
    .returning();

  return NextResponse.json(updatedShot);
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

  // Check if member can access this shot
  const accessError = validateMemberAccess(
    session.user.id,
    shot.userId,
    session.user.role
  );
  if (accessError) return accessError;

  await db.delete(shots).where(eq(shots.id, id));
  return NextResponse.json({ success: true });
}
