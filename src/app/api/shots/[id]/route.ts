import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans, users, shotImages, equipment } from "@/db/schema";
import {
  grinderEquipment,
  machineEquipment,
} from "@/lib/equipment-shot-joins";
import { count, eq, inArray } from "drizzle-orm";
import { validateMemberAccess } from "@/lib/api-auth";
import { createShotSchema } from "@/shared/shots/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
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
      equipmentIds: shots.equipmentIds,
      grinderId: shots.grinderId,
      grinderName: grinderEquipment.name,
      machineId: shots.machineId,
      machineName: machineEquipment.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      sizeOz: shots.sizeOz,
      yieldActualGrams: shots.yieldActualGrams,
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      preInfusionWaitDuration: shots.preInfusionWaitDuration,
      brewPressure: shots.brewPressure,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
      flowRate: shots.flowRate,
      shotQuality: shots.shotQuality,
      rating: shots.rating,
      bitter: shots.bitter,
      sour: shots.sour,
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
    .leftJoin(grinderEquipment, eq(shots.grinderId, grinderEquipment.id))
    .leftJoin(machineEquipment, eq(shots.machineId, machineEquipment.id))
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

  const [imageCountRow] = await db
    .select({ c: count() })
    .from(shotImages)
    .where(eq(shotImages.shotId, id));

  const imageCount = Number(imageCountRow?.c ?? 0);

  const eqIds = (result.equipmentIds as string[] | null) ?? null;
  let equipmentUsedDetails: { id: string; name: string; type: string }[] | null =
    null;
  if (eqIds?.length) {
    const eqRows = await db
      .select({
        id: equipment.id,
        name: equipment.name,
        type: equipment.type,
      })
      .from(equipment)
      .where(inArray(equipment.id, eqIds));
    const byId = new Map(eqRows.map((r) => [r.id, r]));
    const ordered = eqIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => x != null);
    equipmentUsedDetails = ordered.length > 0 ? ordered : null;
  }

  // Compute derived fields on read
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
    equipmentUsedDetails,
    brewRatio,
    daysPostRoast,
    imageCount,
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
    data.brewTimeSecs && data.brewTimeSecs > 0 && yieldForFlow && yieldForFlow > 0
      ? parseFloat((yieldForFlow / data.brewTimeSecs).toFixed(2))
      : null;

  const [updatedShot] = await db
    .update(shots)
    .set({
      beanId: data.beanId,
      grinderId: data.grinderId || null,
      machineId: data.machineId || null,
      equipmentIds: data.equipmentIds?.length ? data.equipmentIds : null,
      doseGrams: data.doseGrams != null ? String(data.doseGrams) : null,
      yieldGrams: data.yieldGrams != null ? String(data.yieldGrams) : null,
      sizeOz: data.sizeOz != null ? String(data.sizeOz) : null,
      grindLevel: data.grindLevel ? String(data.grindLevel) : null,
      brewTempC: data.brewTempC ? String(data.brewTempC) : null,
      brewTimeSecs: data.brewTimeSecs ? String(data.brewTimeSecs) : null,
      yieldActualGrams: data.yieldActualGrams != null ? String(data.yieldActualGrams) : null,
      estimateMaxPressure: data.estimateMaxPressure ? String(data.estimateMaxPressure) : null,
      flowControl: data.flowControl ? String(data.flowControl) : null,
      preInfusionDuration: data.preInfusionDuration ? String(data.preInfusionDuration) : null,
      preInfusionWaitDuration: data.preInfusionWaitDuration ? String(data.preInfusionWaitDuration) : null,
      brewPressure: data.brewPressure ? String(data.brewPressure) : null,
      flowRate: flowRate ? String(flowRate) : null,
      shotQuality: data.shotQuality != null ? String(data.shotQuality) : null,
      rating: data.rating != null ? String(data.rating) : null,
      bitter: data.bitter != null ? String(data.bitter) : null,
      sour: data.sour != null ? String(data.sour) : null,
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
