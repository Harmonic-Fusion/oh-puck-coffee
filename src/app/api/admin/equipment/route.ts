import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { equipment, equipmentPurchaseLink } from "@/db/schema";
import {
  adminCreateEquipmentBodySchema,
  countNonNullSpecValues,
  equipmentTypeSchema,
} from "@/shared/equipment/schema";
import { createEquipmentId } from "@/lib/nanoid-ids";

/** Drizzle wraps PostgresError in `cause`; walk the chain for `23505`. */
function unwrapUniqueViolation(e: unknown): { detail?: string } | undefined {
  let cur: unknown = e;
  while (cur != null) {
    if (typeof cur === "object") {
      const o = cur as { code?: string; detail?: string; cause?: unknown };
      if (o.code === "23505") {
        return { detail: typeof o.detail === "string" ? o.detail : undefined };
      }
      cur = o.cause;
    } else {
      break;
    }
  }
  return undefined;
}
import type { SQL } from "drizzle-orm";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

const APPROVAL = ["all", "approved", "pending"] as const;

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = (searchParams.get("search") || "").trim();
  const typeParam = searchParams.get("type");
  const approvalParam = searchParams.get("approval") || "all";

  const parsedType = typeParam ? equipmentTypeSchema.safeParse(typeParam) : null;
  const typeFilter = parsedType?.success ? parsedType.data : null;

  const approval =
    APPROVAL.includes(approvalParam as (typeof APPROVAL)[number]) ? approvalParam : "all";

  const conditions: SQL[] = [];

  if (typeFilter) {
    conditions.push(eq(equipment.type, typeFilter));
  }
  if (approval === "approved") {
    conditions.push(eq(equipment.adminApproved, true));
  } else if (approval === "pending") {
    conditions.push(eq(equipment.adminApproved, false));
  }

  if (search.length > 0) {
    const pattern = `%${search.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(
      or(
        ilike(equipment.name, pattern),
        sql`coalesce(${equipment.brand}, '') ilike ${pattern}`,
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(equipment)
      .where(whereClause)
      .orderBy(asc(equipment.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(equipment).where(whereClause),
  ]);

  const ids = rows.map((r) => r.id);
  let linkCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const cnts = await db
      .select({
        equipmentId: equipmentPurchaseLink.equipmentId,
        c: count(),
      })
      .from(equipmentPurchaseLink)
      .where(inArray(equipmentPurchaseLink.equipmentId, ids))
      .groupBy(equipmentPurchaseLink.equipmentId);
    linkCounts = Object.fromEntries(cnts.map((c) => [c.equipmentId, c.c]));
  }

  const data = rows.map((r) => ({
    ...r,
    linksCount: linkCounts[r.id] ?? 0,
    nonNullSpecCount: countNonNullSpecValues(r.specs),
  }));

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminCreateEquipmentBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const isGlobal = body.isGlobal ?? true;
  const adminApproved = body.adminApproved ?? true;

  if (body.type === "tool" && body.slug) {
    const [slugTaken] = await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(eq(equipment.slug, body.slug))
      .limit(1);

    if (slugTaken) {
      return NextResponse.json({ error: "A tool with this slug already exists" }, { status: 409 });
    }
  }

  let row: typeof equipment.$inferSelect | undefined;
  try {
    [row] = await db
      .insert(equipment)
      .values({
        id: createEquipmentId(),
        type: body.type,
        name: body.name.trim(),
        brand: body.brand ?? null,
        slug: body.type === "tool" ? body.slug! : null,
        description: body.description ?? null,
        specs: body.specs ?? null,
        isGlobal,
        adminApproved,
        imageId: body.imageId ?? null,
      })
      .returning();
  } catch (e: unknown) {
    const u = unwrapUniqueViolation(e);
    if (u) {
      return NextResponse.json(
        {
          error: "Equipment already exists for this type and name",
          ...(u.detail?.trim() ? { detail: u.detail.trim() } : {}),
        },
        { status: 409 },
      );
    }
    throw e;
  }

  if (!row) {
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }

  return NextResponse.json(row, { status: 201 });
}
