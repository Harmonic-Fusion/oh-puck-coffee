import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { beans, users, shots } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const [bean] = await db
    .select({
      id: beans.id,
      name: beans.name,
      roastLevel: beans.roastLevel,
      roaster: beans.roaster,
      origin: beans.origin,
      processingMethod: beans.processingMethod,
      roastDate: beans.roastDate,
      createdBy: beans.createdBy,
      userEmail: users.email,
      createdAt: beans.createdAt,
    })
    .from(beans)
    .leftJoin(users, eq(beans.createdBy, users.id))
    .where(eq(beans.id, id))
    .limit(1);

  if (!bean) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    bean,
    shotCount: shotStats?.total ?? 0,
    lastShot: lastShot?.createdAt ?? null,
  });
}
