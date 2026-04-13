import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { createFeedbackRequestSchema } from "@/shared/feedback/schema";
import { createFeedbackId } from "@/lib/nanoid-ids";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFeedbackRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const row =
    "source" in parsed.data && parsed.data.source === "client_error"
      ? {
          type: parsed.data.type,
          subject: parsed.data.subject,
          message: parsed.data.message,
        }
      : parsed.data;

  const [result] = await db
    .insert(feedback)
    .values({
      id: createFeedbackId(),
      ...row,
      userId: session.user.id,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
