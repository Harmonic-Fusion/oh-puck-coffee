import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment, equipmentPurchaseLink } from "@/db/schema";
import { createPurchaseLinkId } from "@/lib/nanoid-ids";
import {
  adminCreatePurchaseLinkBodySchema,
} from "@/shared/equipment/schema";
import { eq } from "drizzle-orm";

function rowToJson(row: typeof equipmentPurchaseLink.$inferSelect) {
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    marketplace: row.marketplace,
    affiliateProgram: row.affiliateProgram,
    baseUrl: row.baseUrl,
    affiliateTag: row.affiliateTag,
    priceUsd: row.priceUsd != null ? Number(row.priceUsd) : null,
    region: row.region,
    isCanonical: row.isCanonical,
    approvedByUserId: row.approvedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastVerifiedAt: row.lastVerifiedAt,
    deactivatedAt: row.deactivatedAt,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id: equipmentId } = await params;

  const [eqRow] = await db
    .select({ id: equipment.id })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!eqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(equipmentPurchaseLink)
    .where(eq(equipmentPurchaseLink.equipmentId, equipmentId));

  return NextResponse.json({ links: rows.map(rowToJson) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: equipmentId } = await params;

  const [eqRow] = await db
    .select({ id: equipment.id })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!eqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminCreatePurchaseLinkBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    approved,
    priceUsd,
    region = "US",
    isCanonical = false,
    ...rest
  } = parsed.data;

  const now = new Date();
  const approvedByUserId = approved === true ? session.user.id : null;

  const [inserted] = await db
    .insert(equipmentPurchaseLink)
    .values({
      id: createPurchaseLinkId(),
      equipmentId,
      marketplace: rest.marketplace,
      affiliateProgram: rest.affiliateProgram ?? null,
      baseUrl: rest.baseUrl,
      affiliateTag: rest.affiliateTag ?? null,
      priceUsd: priceUsd != null ? String(priceUsd) : null,
      region,
      isCanonical,
      approvedByUserId,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: null,
      deactivatedAt: null,
    })
    .returning();

  if (!inserted) {
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }

  return NextResponse.json(rowToJson(inserted));
}
