import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { shots, beans, users } from "@/db/schema";
import {
  grinderEquipment,
  machineEquipment,
} from "@/lib/equipment-shot-joins";
import { desc, count, and, SQL, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const conditions: SQL[] = [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: shots.id,
        userId: shots.userId,
        userEmail: users.email,
        beanId: shots.beanId,
        beanName: beans.name,
        grinderId: shots.grinderId,
        grinderName: grinderEquipment.name,
        machineId: shots.machineId,
        machineName: machineEquipment.name,
        doseGrams: shots.doseGrams,
        yieldGrams: shots.yieldGrams,
        yieldActualGrams: shots.yieldActualGrams,
        brewTimeSecs: shots.brewTimeSecs,
        rating: shots.rating,
        shotQuality: shots.shotQuality,
        isReferenceShot: shots.isReferenceShot,
        isHidden: shots.isHidden,
        createdAt: shots.createdAt,
      })
      .from(shots)
      .leftJoin(users, eq(shots.userId, users.id))
      .leftJoin(beans, eq(shots.beanId, beans.id))
      .leftJoin(grinderEquipment, eq(shots.grinderId, grinderEquipment.id))
      .leftJoin(machineEquipment, eq(shots.machineId, machineEquipment.id))
      .where(whereClause)
      .orderBy(desc(shots.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(shots).where(whereClause),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}
