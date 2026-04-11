import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, userEquipment } from "@/db/schema";
import { and, asc, eq, or } from "drizzle-orm";
import {
  equipmentListItemFields,
  parseEquipmentListScope,
  specsFromDb,
} from "@/lib/equipment-list";

const TOOL = "tool" as const;

type ToolListRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  specs: unknown;
  description: string | null;
  createdAt: Date;
  createdBy: string | null;
  isGlobal: boolean;
  imageId: string | null;
  thumbnailBuf: Buffer | null;
};

function mapToolListItem(r: ToolListRow) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    isGlobal: r.isGlobal,
    ...equipmentListItemFields(
      r.brand,
      r.imageId,
      r.thumbnailBuf,
      specsFromDb(r.specs),
    ),
  };
}

async function listToolsMine(userId: string): Promise<ToolListRow[]> {
  const rows = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      description: equipment.description,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: images.thumbnail,
    })
    .from(equipment)
    .innerJoin(
      userEquipment,
      and(
        eq(userEquipment.equipmentId, equipment.id),
        eq(userEquipment.userId, userId),
      ),
    )
    .leftJoin(images, eq(equipment.imageId, images.id))
    .where(eq(equipment.type, TOOL))
    .orderBy(asc(equipment.name));
  return rows.map((r) => ({
    ...r,
    slug: r.slug ?? "",
  }));
}

/** Global catalog plus rows created by this user (`scope=all`). */
async function listToolsAll(userId: string): Promise<ToolListRow[]> {
  const rows = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      description: equipment.description,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: images.thumbnail,
    })
    .from(equipment)
    .leftJoin(images, eq(equipment.imageId, images.id))
    .where(
      and(
        eq(equipment.type, TOOL),
        or(eq(equipment.isGlobal, true), eq(equipment.createdBy, userId)),
      ),
    )
    .orderBy(asc(equipment.name));
  return rows.map((r) => ({
    ...r,
    slug: r.slug ?? "",
  }));
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = parseEquipmentListScope(searchParams);
  if (scope === "invalid") {
    return NextResponse.json(
      { error: "Invalid scope (use mine or all)" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  const rows =
    scope === "mine" ? await listToolsMine(userId) : await listToolsAll(userId);
  return NextResponse.json(rows.map(mapToolListItem));
}
