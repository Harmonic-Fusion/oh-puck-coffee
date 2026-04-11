import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipmentPurchaseLink } from "@/db/schema";
import { adminPatchPurchaseLinkBodySchema } from "@/shared/equipment/schema";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminPatchPurchaseLinkBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const update: Partial<{
    marketplace: string;
    baseUrl: string;
    affiliateProgram: string | null;
    affiliateTag: string | null;
    priceUsd: string | null;
    region: string;
    isCanonical: boolean;
    lastVerifiedAt: Date | null;
    deactivatedAt: Date | null;
    approvedByUserId: string | null;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (data.marketplace !== undefined) update.marketplace = data.marketplace;
  if (data.baseUrl !== undefined) update.baseUrl = data.baseUrl;
  if (data.affiliateProgram !== undefined) update.affiliateProgram = data.affiliateProgram;
  if (data.affiliateTag !== undefined) update.affiliateTag = data.affiliateTag;
  if (data.region !== undefined) update.region = data.region;
  if (data.isCanonical !== undefined) update.isCanonical = data.isCanonical;
  if (data.lastVerifiedAt !== undefined) update.lastVerifiedAt = data.lastVerifiedAt;
  if (data.deactivatedAt !== undefined) update.deactivatedAt = data.deactivatedAt;
  if (data.priceUsd !== undefined) {
    update.priceUsd = data.priceUsd != null ? String(data.priceUsd) : null;
  }
  if (data.approved === true) {
    update.approvedByUserId = session.user.id;
  } else if (data.approved === false) {
    update.approvedByUserId = null;
  }

  const [updated] = await db
    .update(equipmentPurchaseLink)
    .set(update)
    .where(eq(equipmentPurchaseLink.id, linkId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rowToJson(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { linkId } = await params;

  const [removed] = await db
    .delete(equipmentPurchaseLink)
    .where(eq(equipmentPurchaseLink.id, linkId))
    .returning({ id: equipmentPurchaseLink.id });

  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
