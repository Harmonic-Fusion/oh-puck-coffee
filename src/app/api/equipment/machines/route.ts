import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { equipment, images, shots, userEquipment } from "@/db/schema";
import { createMachineSchema } from "@/shared/equipment/schema";
import { and, asc, desc, eq, max, or, sql } from "drizzle-orm";
import { createEquipmentId } from "@/lib/nanoid-ids";
import {
  equipmentListItemFields,
  parseEquipmentListScope,
  specsFromDb,
} from "@/lib/equipment-list";

const MACHINE = "machine" as const;

function shotJoinConditionForMachines(userId: string, role: string) {
  return role !== "admin"
    ? and(eq(shots.machineId, equipment.id), eq(shots.userId, userId))
    : eq(shots.machineId, equipment.id);
}

type MachineRow = {
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

type MachineRecentRow = MachineRow & { lastUsedAt: Date | null };

function mapMachineListItem(r: MachineRow) {
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

function mapMachineRecentItem(r: MachineRecentRow) {
  return {
    ...mapMachineListItem(r),
    lastUsedAt: r.lastUsedAt,
  };
}

async function listMachinesMineByName(userId: string): Promise<MachineRow[]> {
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
    .where(eq(equipment.type, MACHINE))
    .orderBy(asc(equipment.name));
}

async function listMachinesAllByName(userId: string): Promise<MachineRow[]> {
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
        eq(equipment.type, MACHINE),
        or(eq(equipment.isGlobal, true), eq(equipment.createdBy, userId)),
      ),
    )
    .orderBy(asc(equipment.name));
}

async function listMachinesMineRecent(
  userId: string,
  role: string,
): Promise<MachineRecentRow[]> {
  const joinCondition = shotJoinConditionForMachines(userId, role);
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
    .where(eq(equipment.type, MACHINE))
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

async function listMachinesAllRecent(
  userId: string,
  role: string,
): Promise<MachineRecentRow[]> {
  const joinCondition = shotJoinConditionForMachines(userId, role);
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
        eq(equipment.type, MACHINE),
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
        ? await listMachinesMineRecent(userId, role)
        : await listMachinesAllRecent(userId, role);
    return NextResponse.json(rows.map(mapMachineRecentItem));
  }

  const rows =
    scope === "mine"
      ? await listMachinesMineByName(userId)
      : await listMachinesAllByName(userId);
  return NextResponse.json(rows.map(mapMachineListItem));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const body = await request.json();
  const parsed = createMachineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const machineId = createEquipmentId();

  const [machine] = await db
    .insert(equipment)
    .values({
      id: machineId,
      type: MACHINE,
      name: parsed.data.name,
      createdBy: userId,
      isGlobal: false,
    })
    .returning();

  if (!machine) {
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }

  await db
    .insert(userEquipment)
    .values({ userId, equipmentId: machine.id })
    .onConflictDoNothing();

  return NextResponse.json(
    {
      id: machine.id,
      name: machine.name,
      createdAt: machine.createdAt,
      createdBy: machine.createdBy,
      isGlobal: machine.isGlobal,
      ...equipmentListItemFields(
        machine.brand,
        machine.imageId,
        null,
        specsFromDb(machine.specs),
      ),
    },
    { status: 201 },
  );
}
