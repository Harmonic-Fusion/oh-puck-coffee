import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, shots, userEquipment } from "@/db/schema";
import { createGrinderSchema } from "@/shared/equipment/schema";
import { and, asc, desc, eq, max, or, sql } from "drizzle-orm";
import { createEquipmentId } from "@/lib/nanoid-ids";
import {
  equipmentListItemFields,
  parseEquipmentListScope,
  specsFromDb,
} from "@/lib/equipment-list";

const GRINDER = "grinder" as const;

function shotJoinConditionForGrinders(userId: string, role: string) {
  return role !== "admin"
    ? and(eq(shots.grinderId, equipment.id), eq(shots.userId, userId))
    : eq(shots.grinderId, equipment.id);
}

type GrinderRow = {
  id: string;
  name: string;
  brand: string | null;
  specs: unknown;
  createdAt: Date;
  createdBy: string | null;
  isGlobal: boolean;
  imageId: string | null;
  thumbnailBuf: Buffer | null;
};

type GrinderRecentRow = GrinderRow & { lastUsedAt: Date | null };

function mapGrinderListItem(r: GrinderRow) {
  return {
    id: r.id,
    name: r.name,
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

function mapGrinderRecentItem(r: GrinderRecentRow) {
  return {
    ...mapGrinderListItem(r),
    lastUsedAt: r.lastUsedAt,
  };
}

async function listGrindersMineByName(userId: string): Promise<GrinderRow[]> {
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
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
    .where(eq(equipment.type, GRINDER))
    .orderBy(asc(equipment.name));
}

async function listGrindersAllByName(userId: string): Promise<GrinderRow[]> {
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
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
        eq(equipment.type, GRINDER),
        or(eq(equipment.isGlobal, true), eq(equipment.createdBy, userId)),
      ),
    )
    .orderBy(asc(equipment.name));
}

async function listGrindersMineRecent(
  userId: string,
  role: string,
): Promise<GrinderRecentRow[]> {
  const joinCondition = shotJoinConditionForGrinders(userId, role);
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: max(images.thumbnail),
      lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
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
    .leftJoin(shots, joinCondition)
    .where(eq(equipment.type, GRINDER))
    .groupBy(
      equipment.id,
      equipment.name,
      equipment.brand,
      equipment.specs,
      equipment.createdAt,
      equipment.createdBy,
      equipment.isGlobal,
      equipment.imageId,
    )
    .orderBy(desc(sql`max(${shots.createdAt})`), asc(equipment.name));
}

async function listGrindersAllRecent(
  userId: string,
  role: string,
): Promise<GrinderRecentRow[]> {
  const joinCondition = shotJoinConditionForGrinders(userId, role);
  return db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      specs: equipment.specs,
      createdAt: equipment.createdAt,
      createdBy: equipment.createdBy,
      isGlobal: equipment.isGlobal,
      imageId: equipment.imageId,
      thumbnailBuf: max(images.thumbnail),
      lastUsedAt: max(shots.createdAt).as("lastUsedAt"),
    })
    .from(equipment)
    .leftJoin(images, eq(equipment.imageId, images.id))
    .leftJoin(shots, joinCondition)
    .where(
      and(
        eq(equipment.type, GRINDER),
        or(eq(equipment.isGlobal, true), eq(equipment.createdBy, userId)),
      ),
    )
    .groupBy(
      equipment.id,
      equipment.name,
      equipment.brand,
      equipment.specs,
      equipment.createdAt,
      equipment.createdBy,
      equipment.isGlobal,
      equipment.imageId,
    )
    .orderBy(desc(sql`max(${shots.createdAt})`), asc(equipment.name));
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

  const orderBy = searchParams.get("orderBy");
  const userId = session.user.id;
  const role = session.user.role ?? "member";

  if (orderBy === "recent") {
    const rows =
      scope === "mine"
        ? await listGrindersMineRecent(userId, role)
        : await listGrindersAllRecent(userId, role);
    return NextResponse.json(rows.map(mapGrinderRecentItem));
  }

  const rows =
    scope === "mine"
      ? await listGrindersMineByName(userId)
      : await listGrindersAllByName(userId);
  return NextResponse.json(rows.map(mapGrinderListItem));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const body = await request.json();
  const parsed = createGrinderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const grinderId = createEquipmentId();

  const [grinder] = await db
    .insert(equipment)
    .values({
      id: grinderId,
      type: GRINDER,
      name: parsed.data.name,
      createdBy: userId,
      isGlobal: false,
    })
    .returning();

  if (!grinder) {
    return NextResponse.json({ error: "Failed to create grinder" }, { status: 500 });
  }

  await db
    .insert(userEquipment)
    .values({ userId, equipmentId: grinder.id })
    .onConflictDoNothing();

  return NextResponse.json(
    {
      id: grinder.id,
      name: grinder.name,
      createdAt: grinder.createdAt,
      createdBy: grinder.createdBy,
      isGlobal: grinder.isGlobal,
      ...equipmentListItemFields(
        grinder.brand,
        grinder.imageId,
        null,
        specsFromDb(grinder.specs),
      ),
    },
    { status: 201 },
  );
}
