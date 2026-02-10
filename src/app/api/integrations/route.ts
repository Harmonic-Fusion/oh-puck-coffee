import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { linkSheetSchema } from "@/shared/integrations/schema";
import {
  validateSpreadsheetAccess,
  writeHeaderRow,
} from "@/lib/google-sheets";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id))
    .limit(1);

  return NextResponse.json(integration || null);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = linkSheetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { spreadsheetId } = parsed.data;

  // Validate access to the spreadsheet
  let spreadsheetName: string;
  try {
    spreadsheetName = await validateSpreadsheetAccess(
      session.user.id,
      spreadsheetId
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not access spreadsheet",
      },
      { status: 400 }
    );
  }

  // Write header row
  try {
    await writeHeaderRow(session.user.id, spreadsheetId);
  } catch {
    return NextResponse.json(
      { error: "Could not write header row to spreadsheet" },
      { status: 400 }
    );
  }

  // Check if user already has an integration
  const [existing] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id))
    .limit(1);

  let result;

  if (existing) {
    // Update existing
    [result] = await db
      .update(integrations)
      .set({
        spreadsheetId,
        spreadsheetName,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing.id))
      .returning();
  } else {
    // Create new
    [result] = await db
      .insert(integrations)
      .values({
        userId: session.user.id,
        provider: "google_sheets",
        spreadsheetId,
        spreadsheetName,
        isActive: true,
      })
      .returning();
  }

  return NextResponse.json(result, { status: existing ? 200 : 201 });
}
