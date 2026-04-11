import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { shots, beans, users } from "@/db/schema";
import {
  grinderEquipment,
  machineEquipment,
} from "@/lib/equipment-shot-joins";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [shot] = await db
    .select({
      id: shots.id,
      userId: shots.userId,
      userEmail: users.email,
      userName: users.name,
      beanId: shots.beanId,
      beanName: beans.name,
      grinderId: shots.grinderId,
      grinderName: grinderEquipment.name,
      machineId: shots.machineId,
      machineName: machineEquipment.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      yieldActualGrams: shots.yieldActualGrams,
      grindLevel: shots.grindLevel,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      preInfusionWaitDuration: shots.preInfusionWaitDuration,
      brewPressure: shots.brewPressure,
      brewTimeSecs: shots.brewTimeSecs,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
      flowRate: shots.flowRate,
      rating: shots.rating,
      shotQuality: shots.shotQuality,
      bitter: shots.bitter,
      sour: shots.sour,
      flavors: shots.flavors,
      bodyTexture: shots.bodyTexture,
      adjectives: shots.adjectives,
      toolsUsed: shots.toolsUsed,
      notes: shots.notes,
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

  if (!shot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(shot);
}
