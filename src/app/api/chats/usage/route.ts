import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { getAiSuggestionLimit } from "@/shared/entitlements";
import {
  aiChatUsageResponseSchema,
  SHOT_SUGGESTION_CHAT_TYPE,
} from "@/shared/ai-suggestions/schema";
import { getUtcMondayStart } from "@/lib/ai-suggestions/utc-week";
import { and, count, eq, gte } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getUtcMondayStart(new Date());
  const [row] = await db
    .select({ n: count() })
    .from(chats)
    .where(
      and(
        eq(chats.userId, session.user.id),
        eq(chats.type, SHOT_SUGGESTION_CHAT_TYPE),
        gte(chats.createdAt, weekStart),
      ),
    );

  const usedThisWeek = Number(row?.n ?? 0);
  const weeklyLimit = getAiSuggestionLimit(session.user.entitlements);

  const body = aiChatUsageResponseSchema.parse({
    usedThisWeek,
    weeklyLimit,
    weekStartsAt: weekStart.toISOString(),
  });

  return NextResponse.json(body);
}
