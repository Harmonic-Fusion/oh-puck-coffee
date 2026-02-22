import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots, beans, users, grinders, machines, tools, integrations } from "@/db/schema";
import { createShotSchema } from "@/shared/shots/schema";
import { eq, desc, asc, and, gte, lte, inArray, SQL } from "drizzle-orm";
import { appendShotRow } from "@/lib/google-sheets";

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

  const conditions: SQL[] = [];
  
  // Members can only see their own shots
  if (session.user.role !== "admin") {
    conditions.push(eq(shots.userId, session.user.id));
  } else if (userId) {
    // Admins can filter by userId if provided
    conditions.push(eq(shots.userId, userId));
  }
  
  if (beanId) conditions.push(eq(shots.beanId, beanId));
  if (dateFrom) conditions.push(gte(shots.createdAt, new Date(dateFrom)));
  if (dateTo) {
    // End of the day
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(shots.createdAt, end));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort column
  const sortColumn =
    sort === "shotQuality"
      ? shots.shotQuality
      : sort === "doseGrams"
        ? shots.doseGrams
        : shots.createdAt;

  const orderFn = order === "asc" ? asc : desc;

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
    .limit(limit)
    .offset(offset);

  // Compute derived fields on read
  const enriched = results.map((row) => {
    const dose = parseFloat(row.doseGrams);
    const yieldG = parseFloat(row.yieldGrams);
    const brewRatio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;

    let daysPostRoast: number | null = null;
    if (row.beanRoastDate) {
      const shotDate = new Date(row.createdAt);
      const roastDate = new Date(row.beanRoastDate);
      daysPostRoast = Math.floor(
        (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      ...row,
      brewRatio,
      daysPostRoast,
    };
  });

  return NextResponse.json(enriched);
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
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate yieldActualGrams is present (required field)
  if (data.yieldActualGrams == null || data.yieldActualGrams <= 0) {
    return NextResponse.json(
      { error: "Validation failed", details: { yieldActualGrams: "Actual yield is required and must be positive" } },
      { status: 400 }
    );
  }

  // Compute flow rate (stored on write) - use actual yield if available, otherwise target yield
  const yieldForFlow = data.yieldActualGrams ?? data.yieldGrams;
  const flowRate =
    data.brewTimeSecs && data.brewTimeSecs > 0 && yieldForFlow
      ? parseFloat((yieldForFlow / data.brewTimeSecs).toFixed(2))
      : null;

  try {
    const [shot] = await db
      .insert(shots)
      .values({
        userId: session.user.id,
        beanId: data.beanId,
        grinderId: data.grinderId,
        machineId: data.machineId || null,
        doseGrams: String(data.doseGrams),
        yieldGrams: String(data.yieldGrams),
        grindLevel: data.grindLevel ? String(data.grindLevel) : null,
        brewTempC: data.brewTempC ? String(data.brewTempC) : null,
        brewTimeSecs: data.brewTimeSecs ? String(data.brewTimeSecs) : null,
        yieldActualGrams: String(data.yieldActualGrams),
        estimateMaxPressure: data.estimateMaxPressure ? String(data.estimateMaxPressure) : null,
        flowControl: data.flowControl ? String(data.flowControl) : null,
        preInfusionDuration: data.preInfusionDuration ? String(data.preInfusionDuration) : null,
        brewPressure: data.brewPressure ? String(data.brewPressure) : null,
        flowRate: flowRate ? String(flowRate) : null,
        shotQuality: data.shotQuality ? String(data.shotQuality) : null,
        rating: data.rating ? String(data.rating) : null,
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
            eq(integrations.isActive, true)
          )
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
          dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;

        let daysPostRoast: number | null = null;
        if (bean?.roastDate) {
          const shotDate = new Date(shot.createdAt);
          const roastDate = new Date(bean.roastDate);
          daysPostRoast = Math.floor(
            (shotDate.getTime() - roastDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );
        }

        await appendShotRow(session.user!.id!, integration.spreadsheetId, {
          createdAt: shot.createdAt,
          userName: session.user!.name ?? null,
          beanName: bean?.name ?? null,
          beanRoastLevel: bean?.roastLevel ?? null,
          beanRoastDate: bean?.roastDate ?? null,
          doseGrams: shot.doseGrams,
          yieldGrams: shot.yieldGrams,
          yieldActualGrams: shot.yieldActualGrams,
          brewRatio,
          grindLevel: shot.grindLevel ?? "",
          brewTimeSecs: shot.brewTimeSecs,
          brewTempC: shot.brewTempC,
          preInfusionDuration: shot.preInfusionDuration,
          brewPressure: shot.brewPressure,
          flowRate: shot.flowRate,
          shotQuality: parseFloat(shot.shotQuality),
          rating: shot.rating ? parseFloat(shot.rating) : null,
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
        errorMessage = "Invalid data: one or more values are too large for the database field";
      } else if (error.message.includes("foreign key")) {
        errorMessage = "Invalid reference: one or more selected items no longer exist";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
