import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots } from "@/db/schema";
import { eq, not } from "drizzle-orm";

export async function PATCH(
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

  const [updated] = await db
    .update(shots)
    .set({
      isHidden: not(shots.isHidden),
      updatedAt: new Date(),
    })
    .where(eq(shots.id, id))
    .returning();

  return NextResponse.json(updated);
}
