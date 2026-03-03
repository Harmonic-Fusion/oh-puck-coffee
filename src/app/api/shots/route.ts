import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import {
  shots,
  beans,
  users,
  grinders,
  machines,
  tools,
  integrations,
} from "@/db/schema";
import { createShotSchema } from "@/shared/shots/schema";
import {
  eq,
  desc,
  asc,
  and,
  gte,
  lte,
  inArray,
  SQL,
  sql,
  count,
} from "drizzle-orm";
import { appendShotRow } from "@/lib/google-sheets";
import { config } from "@/shared/config";
import { Entitlements, hasEntitlement } from "@/lib/entitlements";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const beanId = searchParams.get("beanId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // New filter params
  const beanIds = searchParams.get("beanIds")?.split(",").filter(Boolean) || [];
  const isHidden = searchParams.get("isHidden");
  const isReferenceShot = searchParams.get("isReferenceShot");
  const grinderIds =
    searchParams.get("grinderIds")?.split(",").filter(Boolean) || [];
  const machineIds =
    searchParams.get("machineIds")?.split(",").filter(Boolean) || [];
  const ratingMin = searchParams.get("ratingMin");
  const ratingMax = searchParams.get("ratingMax");
  const bitterMin = searchParams.get("bitterMin");
  const bitterMax = searchParams.get("bitterMax");
  const sourMin = searchParams.get("sourMin");
  const sourMax = searchParams.get("sourMax");
  const shotQualityMin = searchParams.get("shotQualityMin");
  const shotQualityMax = searchParams.get("shotQualityMax");
  const flavors = searchParams.get("flavors")?.split(",").filter(Boolean) || [];
  const bodyTexture =
    searchParams.get("bodyTexture")?.split(",").filter(Boolean) || [];
  const adjectives =
    searchParams.get("adjectives")?.split(",").filter(Boolean) || [];
  const toolsUsed =
    searchParams.get("toolsUsed")?.split(",").filter(Boolean) || [];
  const ratioMin = searchParams.get("ratioMin");
  const ratioMax = searchParams.get("ratioMax");

  // Check if the user has the entitlement to view unlimited shots
  const hasUnlimitedShots =
    session.user.role === "admin" ||
    hasEntitlement(session.user.entitlements, Entitlements.NO_SHOT_VIEW_LIMIT);
  const shotLimit = config.shotViewLimit;

  // Clamp limit + offset so free-tier users cannot paginate past their cap
  let effectiveLimit = limit;
  let effectiveOffset = offset;
  if (!hasUnlimitedShots) {
    if (effectiveOffset >= shotLimit) {
      // Entirely past the cap — return empty
      return NextResponse.json([], {
        headers: {
          "X-Shot-View-Limit": String(shotLimit),
        },
      });
    }
    effectiveLimit = Math.min(effectiveLimit, shotLimit - effectiveOffset);
  }

  const conditions: SQL[] = [];

  // Members can only see their own shots
  if (session.user.role !== "admin") {
    conditions.push(eq(shots.userId, session.user.id));
  } else if (userId) {
    // Admins can filter by userId if provided
    conditions.push(eq(shots.userId, userId));
  }

  // Legacy beanId support (single)
  if (beanId) {
    conditions.push(eq(shots.beanId, beanId));
  }
  // New beanIds support (multi-select)
  if (beanIds.length > 0) {
    conditions.push(inArray(shots.beanId, beanIds));
  }

  if (dateFrom) conditions.push(gte(shots.createdAt, new Date(dateFrom)));
  if (dateTo) {
    // End of the day
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(shots.createdAt, end));
  }

  // Hidden filter
  if (isHidden === "yes") {
    conditions.push(eq(shots.isHidden, true));
  } else if (isHidden === "no") {
    conditions.push(eq(shots.isHidden, false));
  }
  // If isHidden is "all" or not provided, no filter applied

  // Reference shot filter
  if (isReferenceShot === "true") {
    conditions.push(eq(shots.isReferenceShot, true));
  } else if (isReferenceShot === "false") {
    conditions.push(eq(shots.isReferenceShot, false));
  }

  // Grinder filter
  if (grinderIds.length > 0) {
    conditions.push(inArray(shots.grinderId, grinderIds));
  }

  // Machine filter
  if (machineIds.length > 0) {
    conditions.push(inArray(shots.machineId, machineIds));
  }

  // Rating filter (range: ratingMin to ratingMax, where e.g. "2" means 1.5-2.4)
  // Note: This is handled post-query since we need to check multiple ranges

  // Bitter filter
  if (bitterMin) {
    conditions.push(gte(shots.bitter, sql`${bitterMin}`));
  }
  if (bitterMax) {
    conditions.push(lte(shots.bitter, sql`${bitterMax}`));
  }

  // Sour filter
  if (sourMin) {
    conditions.push(gte(shots.sour, sql`${sourMin}`));
  }
  if (sourMax) {
    conditions.push(lte(shots.sour, sql`${sourMax}`));
  }

  // Shot quality filter (range: shotQualityMin to shotQualityMax)
  // Note: This is handled post-query since we need to check multiple ranges

  // Flavors filter (JSONB array overlap) - handled post-query for safety
  // Body texture filter (JSONB array overlap) - handled post-query for safety
  // Adjectives filter (JSONB array overlap) - handled post-query for safety
  // Tools used filter (JSONB array overlap) - handled post-query for safety

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort column
  const sortColumn =
    sort === "shotQuality"
      ? shots.shotQuality
      : sort === "doseGrams"
        ? shots.doseGrams
        : shots.createdAt;

  const orderFn = order === "asc" ? asc : desc;

  // Fetch total count for the current user (ignoring limit/offset) for banner
  let totalCount: number | null = null;
  if (!hasUnlimitedShots) {
    const userConditions: SQL[] = [eq(shots.userId, session.user.id)];
    const [countRow] = await db
      .select({ total: count() })
      .from(shots)
      .where(and(...userConditions));
    totalCount = countRow?.total ?? 0;
  }

  const results = await db
    .select({
      id: shots.id,
      userId: shots.userId,
      userName: users.name,
      beanId: shots.beanId,
      beanName: beans.name,
      beanRoastLevel: beans.roastLevel,
      beanRoastDate: beans.roastDate,
      grinderId: shots.grinderId,
      grinderName: grinders.name,
      machineId: shots.machineId,
      machineName: machines.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      sizeOz: shots.sizeOz,
      yieldActualGrams: shots.yieldActualGrams,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      brewPressure: shots.brewPressure,
      flowRate: shots.flowRate,
      shotQuality: shots.shotQuality,
      rating: shots.rating,
      bitter: shots.bitter,
      sour: shots.sour,
      toolsUsed: shots.toolsUsed,
      notes: shots.notes,
      flavors: shots.flavors,
      bodyTexture: shots.bodyTexture,
      adjectives: shots.adjectives,
      isReferenceShot: shots.isReferenceShot,
      isHidden: shots.isHidden,
      createdAt: shots.createdAt,
      updatedAt: shots.updatedAt,
    })
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(effectiveLimit)
    .offset(effectiveOffset);

  // Compute derived fields on read
  let enriched = results.map((row) => {
    const dose = row.doseGrams ? parseFloat(row.doseGrams) : null;
    const yieldG = row.yieldGrams ? parseFloat(row.yieldGrams) : null;
    const brewRatio =
      dose !== null && yieldG !== null && dose > 0
        ? parseFloat((yieldG / dose).toFixed(2))
        : null;

    let daysPostRoast: number | null = null;
    if (row.beanRoastDate) {
      const shotDate = new Date(row.createdAt);
      const roastDate = new Date(row.beanRoastDate);
      daysPostRoast = Math.floor(
        (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      ...row,
      brewRatio,
      daysPostRoast,
    };
  });

  // Apply post-query filters (for computed fields, JSONB arrays, and multi-range filters)
  const needsPostFilter =
    ratingMin ||
    ratingMax ||
    shotQualityMin ||
    shotQualityMax ||
    ratioMin ||
    ratioMax ||
    flavors.length > 0 ||
    bodyTexture.length > 0 ||
    adjectives.length > 0 ||
    toolsUsed.length > 0;

  if (needsPostFilter) {
    enriched = enriched.filter((row) => {
      // Rating filter (check if rating falls within any selected range)
      if (ratingMin || ratingMax) {
        if (row.rating === null) return false;
        const rating = parseFloat(row.rating);
        const min = ratingMin ? parseFloat(ratingMin) - 0.5 : 0;
        const max = ratingMax ? parseFloat(ratingMax) + 0.4 : 10;
        if (rating < min || rating > max) return false;
      }

      // Shot quality filter (check if quality falls within any selected range)
      if (shotQualityMin || shotQualityMax) {
        if (row.shotQuality === null) return false;
        const quality = parseFloat(row.shotQuality);
        const min = shotQualityMin ? parseFloat(shotQualityMin) - 0.5 : 0;
        const max = shotQualityMax ? parseFloat(shotQualityMax) + 0.4 : 10;
        if (quality < min || quality > max) return false;
      }

      // Ratio filter (since brewRatio is computed)
      if (ratioMin || ratioMax) {
        if (row.brewRatio === null) return false;
        const ratio = row.brewRatio;
        if (ratioMin && ratio < parseFloat(ratioMin)) return false;
        if (ratioMax && ratio > parseFloat(ratioMax)) return false;
      }

      // Flavors filter (JSONB array overlap)
      if (flavors.length > 0) {
        const rowFlavors = (row.flavors as string[] | null) || [];
        const hasMatch = flavors.some((f) => rowFlavors.includes(f));
        if (!hasMatch) return false;
      }

      // Body texture filter (JSONB array overlap)
      if (bodyTexture.length > 0) {
        const rowBody = (row.bodyTexture as string[] | null) || [];
        const hasMatch = bodyTexture.some((b) => rowBody.includes(b));
        if (!hasMatch) return false;
      }

      // Adjectives filter (JSONB array overlap)
      if (adjectives.length > 0) {
        const rowAdjectives = (row.adjectives as string[] | null) || [];
        const hasMatch = adjectives.some((a) => rowAdjectives.includes(a));
        if (!hasMatch) return false;
      }

      // Tools used filter (JSONB array overlap)
      if (toolsUsed.length > 0) {
        const rowTools = (row.toolsUsed as string[] | null) || [];
        const hasMatch = toolsUsed.some((t) => rowTools.includes(t));
        if (!hasMatch) return false;
      }

      return true;
    });
  }

  const responseHeaders: Record<string, string> = {};
  if (!hasUnlimitedShots) {
    responseHeaders["X-Shot-View-Limit"] = String(shotLimit);
    if (totalCount !== null) {
      responseHeaders["X-Shot-Total-Count"] = String(totalCount);
    }
  }

  return NextResponse.json(enriched, { headers: responseHeaders });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createShotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Compute flow rate (stored on write) - use actual yield if available, otherwise target yield
  const yieldForFlow = data.yieldActualGrams ?? data.yieldGrams;
  const flowRate =
    data.brewTimeSecs &&
    data.brewTimeSecs > 0 &&
    yieldForFlow &&
    yieldForFlow > 0
      ? parseFloat((yieldForFlow / data.brewTimeSecs).toFixed(2))
      : null;

  try {
    const [shot] = await db
      .insert(shots)
      .values({
        userId: session.user.id,
        beanId: data.beanId,
        grinderId: data.grinderId || null,
        machineId: data.machineId || null,
        doseGrams: data.doseGrams != null ? String(data.doseGrams) : null,
        yieldGrams: data.yieldGrams != null ? String(data.yieldGrams) : null,
        sizeOz: data.sizeOz != null ? String(data.sizeOz) : null,
        grindLevel: data.grindLevel ? String(data.grindLevel) : null,
        brewTempC: data.brewTempC ? String(data.brewTempC) : null,
        brewTimeSecs: data.brewTimeSecs ? String(data.brewTimeSecs) : null,
        yieldActualGrams:
          data.yieldActualGrams != null ? String(data.yieldActualGrams) : null,
        estimateMaxPressure: data.estimateMaxPressure
          ? String(data.estimateMaxPressure)
          : null,
        flowControl: data.flowControl ? String(data.flowControl) : null,
        preInfusionDuration: data.preInfusionDuration
          ? String(data.preInfusionDuration)
          : null,
        brewPressure: data.brewPressure ? String(data.brewPressure) : null,
        flowRate: flowRate ? String(flowRate) : null,
        shotQuality: data.shotQuality ? String(data.shotQuality) : null,
        rating: String(data.rating),
        bitter: data.bitter ? String(data.bitter) : null,
        sour: data.sour ? String(data.sour) : null,
        toolsUsed: data.toolsUsed || null,
        notes: data.notes || null,
        flavors: data.flavors || null,
        bodyTexture: data.bodyTexture || null,
        adjectives: data.adjectives || null,
      })
      .returning();

    // Fire-and-forget: append to Google Sheet if integration active
    (async () => {
      try {
        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, session.user!.id!),
              eq(integrations.isActive, true),
            ),
          )
          .limit(1);

        if (integration?.spreadsheetId) {
          // Get bean info for the row
          const [bean] = await db
            .select()
            .from(beans)
            .where(eq(beans.id, data.beanId))
            .limit(1);

          // Resolve tool slugs to names for the spreadsheet
          const toolSlugs = (shot.toolsUsed as string[] | null) ?? [];
          let toolNames: string[] = [];
          if (toolSlugs.length > 0) {
            const toolRows = await db
              .select({ slug: tools.slug, name: tools.name })
              .from(tools)
              .where(inArray(tools.slug, toolSlugs));
            const slugToName = new Map(toolRows.map((t) => [t.slug, t.name]));
            toolNames = toolSlugs.map((s) => slugToName.get(s) || s);
          }

          const dose = data.doseGrams;
          const yieldG = data.yieldGrams;
          const brewRatio =
            dose !== undefined && yieldG !== undefined && dose > 0
              ? parseFloat((yieldG / dose).toFixed(2))
              : null;

          let daysPostRoast: number | null = null;
          if (bean?.roastDate) {
            const shotDate = new Date(shot.createdAt);
            const roastDate = new Date(bean.roastDate);
            daysPostRoast = Math.floor(
              (shotDate.getTime() - roastDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
          }

          await appendShotRow(session.user!.id!, integration.spreadsheetId, {
            createdAt: shot.createdAt,
            userName: session.user!.name ?? null,
            beanName: bean?.name ?? null,
            beanRoastLevel: bean?.roastLevel ?? null,
            beanRoastDate: bean?.roastDate ?? null,
            doseGrams: shot.doseGrams ?? "",
            yieldGrams: shot.yieldGrams ?? "",
            yieldActualGrams: shot.yieldActualGrams,
            brewRatio,
            grindLevel: shot.grindLevel ?? "",
            brewTimeSecs: shot.brewTimeSecs,
            brewTempC: shot.brewTempC,
            preInfusionDuration: shot.preInfusionDuration,
            brewPressure: shot.brewPressure,
            flowRate: shot.flowRate,
            shotQuality: shot.shotQuality ? parseFloat(shot.shotQuality) : null,
            rating: shot.rating ? parseFloat(shot.rating) : null,
            bitter: shot.bitter ? parseFloat(shot.bitter) : null,
            sour: shot.sour ? parseFloat(shot.sour) : null,
            flavors: shot.flavors,
            bodyTexture: shot.bodyTexture,
            adjectives: shot.adjectives,
            toolsUsed: toolNames.length > 0 ? toolNames : null,
            notes: shot.notes,
            daysPostRoast,
            isReferenceShot: shot.isReferenceShot,
          });
        }
      } catch (err) {
        console.error("Failed to append shot to Google Sheet:", err);
      }
    })();

    return NextResponse.json(shot, { status: 201 });
  } catch (error) {
    console.error("Failed to create shot:", error);

    // Handle database errors with user-friendly messages
    let errorMessage = "Failed to create shot";
    if (error instanceof Error) {
      // Check for specific database errors
      if (error.message.includes("numeric field overflow")) {
        errorMessage =
          "Invalid data: one or more values are too large for the database field";
      } else if (error.message.includes("foreign key")) {
        errorMessage =
          "Invalid reference: one or more selected items no longer exist";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
