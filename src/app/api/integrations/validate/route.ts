import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { linkSheetSchema } from "@/shared/integrations/schema";
import { validateSpreadsheetAccess } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  const session = await auth();
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

  try {
    const title = await validateSpreadsheetAccess(
      session.user.id,
      parsed.data.spreadsheetId
    );
    return NextResponse.json({ valid: true, title });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not access spreadsheet",
      },
      { status: 400 }
    );
  }
}
