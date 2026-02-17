import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { createFeedbackSchema } from "@/shared/feedback/schema";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [result] = await db
    .insert(feedback)
    .values({
      ...parsed.data,
      userId: session.user.id,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
