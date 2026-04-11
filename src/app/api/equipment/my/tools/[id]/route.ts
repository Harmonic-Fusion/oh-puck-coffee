import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { userEquipment } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  const deleted = await db
    .delete(userEquipment)
    .where(
      and(
        eq(userEquipment.userId, session.user.id),
        eq(userEquipment.equipmentId, toolId),
      ),
    )
    .returning({ equipmentId: userEquipment.equipmentId });

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Tool not in your collection" },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
