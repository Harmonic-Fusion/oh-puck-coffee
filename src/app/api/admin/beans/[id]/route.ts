import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { beans, beansShare, users, origins, roasters, shots } from "@/db/schema";
import { eq, count, desc, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [row] = await db
    .select({
      id: beans.id,
      name: beans.name,
      roastLevel: beans.roastLevel,
      originId: beans.originId,
      roasterId: beans.roasterId,
      originName: origins.name,
      roasterName: roasters.name,
      processingMethod: beans.processingMethod,
      roastDate: beans.roastDate,
      ownerId: beansShare.userId,
      userEmail: users.email,
      createdAt: beans.createdAt,
    })
    .from(beans)
    .leftJoin(beansShare, and(eq(beans.id, beansShare.beanId), eq(beansShare.status, "owner")))
    .leftJoin(users, eq(beansShare.userId, users.id))
    .leftJoin(origins, eq(beans.originId, origins.id))
    .leftJoin(roasters, eq(beans.roasterId, roasters.id))
    .where(eq(beans.id, id))
    .limit(1);

  if (!row) {
    const [fallback] = await db
      .select()
      .from(beans)
      .where(eq(beans.id, id))
      .limit(1);
    if (!fallback) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [ownerRow] = await db
      .select({ userId: beansShare.userId })
      .from(beansShare)
      .where(and(eq(beansShare.beanId, id), eq(beansShare.status, "owner")))
      .limit(1);
    const [ownerUser] = ownerRow
      ? await db.select({ email: users.email }).from(users).where(eq(users.id, ownerRow.userId)).limit(1)
      : [null];
    return NextResponse.json({
      bean: {
        id: fallback.id,
        name: fallback.name,
        roastLevel: fallback.roastLevel,
        origin: null,
        roaster: null,
        createdBy: ownerRow?.userId ?? null,
        processingMethod: fallback.processingMethod,
        roastDate: fallback.roastDate,
        userEmail: ownerUser?.email ?? null,
        createdAt: fallback.createdAt,
      },
      shotCount: 0,
      lastShot: null,
    });
  }

  const [shotStats] = await db
    .select({ total: count() })
    .from(shots)
    .where(eq(shots.beanId, id));

  const [lastShot] = await db
    .select({ createdAt: shots.createdAt })
    .from(shots)
    .where(eq(shots.beanId, id))
    .orderBy(desc(shots.createdAt))
    .limit(1);

  return NextResponse.json({
    bean: {
      id: row.id,
      name: row.name,
      roastLevel: row.roastLevel,
      origin: row.originName,
      roaster: row.roasterName,
      createdBy: row.ownerId,
      processingMethod: row.processingMethod,
      roastDate: row.roastDate,
      userEmail: row.userEmail,
      createdAt: row.createdAt,
    },
    shotCount: shotStats?.total ?? 0,
    lastShot: lastShot?.createdAt ?? null,
  });
}
