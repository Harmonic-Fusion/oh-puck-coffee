import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, userEquipment } from "@/db/schema";
import { myToolCollectionBodySchema } from "@/shared/equipment/schema";
import { and, eq } from "drizzle-orm";
import { equipmentListItemFields } from "@/lib/equipment-list";

const TOOL = "tool" as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = myToolCollectionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const toolId = parsed.data.toolId;

  const [row] = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      name: equipment.name,
      brand: equipment.brand,
      description: equipment.description,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: images.thumbnail,
    })
    .from(equipment)
    .leftJoin(images, eq(equipment.imageId, images.id))
    .where(and(eq(equipment.id, toolId), eq(equipment.type, TOOL)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  const visible = row.isGlobal || row.createdBy === userId;
  if (!visible) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .insert(userEquipment)
    .values({ userId, equipmentId: row.id })
    .onConflictDoNothing();

  return NextResponse.json(
    {
      id: row.id,
      slug: row.slug ?? "",
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      isGlobal: row.isGlobal,
      ...equipmentListItemFields(row.brand, row.imageId, row.thumbnailBuf),
    },
    { status: 201 },
  );
}
