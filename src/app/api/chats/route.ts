import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getSession } from "@/auth";
import { db } from "@/db";
import {
  aiBeansMemory,
  aiUserMemory,
  beansShare,
  chats,
  chatMessages,
  origins,
  shots,
} from "@/db/schema";
import { canAccessBean } from "@/lib/beans-access";
import { createSuggestionLanguageModel } from "@/lib/ai-suggestions/model";
import { buildShotSuggestionMessages } from "@/lib/ai-suggestions/prompts";
import { shotRowToSummaryInput } from "@/lib/ai-suggestions/shot-summary";
import { getUtcMondayStart } from "@/lib/ai-suggestions/utc-week";
import {
  createChatId,
  createChatMessageId,
} from "@/lib/nanoid-ids";
import { config } from "@/shared/config";
import {
  aiChatHistoryItemSchema,
  createAiChatRequestSchema,
  createAiChatResponseSchema,
  SHOT_SUGGESTION_CHAT_TYPE,
} from "@/shared/ai-suggestions/schema";
import { getAiSuggestionLimit } from "@/shared/entitlements";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = createSuggestionLanguageModel();
  if (!model) {
    return NextResponse.json(
      {
        error: "AI is not configured",
        code: "openai_not_configured",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createAiChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { beanId } = parsed.data;
  const userId = session.user.id;

  const access = await canAccessBean(userId, beanId, session.user.role);
  if (!access.allowed) {
    return access.error;
  }

  const weeklyLimit = getAiSuggestionLimit(session.user.entitlements);
  const weekStart = getUtcMondayStart(new Date());

  const [usageRow] = await db
    .select({ n: count() })
    .from(chats)
    .where(
      and(
        eq(chats.userId, userId),
        eq(chats.type, SHOT_SUGGESTION_CHAT_TYPE),
        gte(chats.createdAt, weekStart),
      ),
    );

  const usedBefore = Number(usageRow?.n ?? 0);
  if (usedBefore >= weeklyLimit) {
    return NextResponse.json(
      {
        error: "Weekly AI suggestion limit reached",
        code: "ai_suggestion_limit",
        usedThisWeek: usedBefore,
        weeklyLimit,
      },
      { status: 429 },
    );
  }

  let originName: string | undefined;
  if (access.bean.originId) {
    const [originRow] = await db
      .select({ name: origins.name })
      .from(origins)
      .where(eq(origins.id, access.bean.originId))
      .limit(1);
    originName = originRow?.name ?? undefined;
  }

  const [referenceRow] = await db
    .select()
    .from(shots)
    .where(
      and(
        eq(shots.userId, userId),
        eq(shots.beanId, beanId),
        eq(shots.isReferenceShot, true),
        eq(shots.isHidden, false),
      ),
    )
    .limit(1);

  const shotRows = await db
    .select()
    .from(shots)
    .where(
      and(
        eq(shots.userId, userId),
        eq(shots.beanId, beanId),
        eq(shots.isHidden, false),
      ),
    )
    .orderBy(desc(shots.createdAt))
    .limit(15);

  const historyRows = shotRows.filter(
    (s) => !referenceRow || s.id !== referenceRow.id,
  );

  const [userMemRow] = await db
    .select({ content: aiUserMemory.content })
    .from(aiUserMemory)
    .where(eq(aiUserMemory.userId, userId))
    .limit(1);

  const [beanMemRow] = await db
    .select({ content: aiBeansMemory.content })
    .from(aiBeansMemory)
    .where(eq(aiBeansMemory.beanId, beanId))
    .limit(1);

  const suggestionMessages = buildShotSuggestionMessages({
    beanName: access.bean.name,
    roastLevel: access.bean.roastLevel,
    originName,
    processingMethod: access.bean.processingMethod ?? undefined,
    shotHistory: historyRows.map(shotRowToSummaryInput),
    referenceShot: referenceRow
      ? shotRowToSummaryInput(referenceRow)
      : undefined,
    userMemory: userMemRow?.content,
    beanMemory: beanMemRow?.content,
  });

  const chatId = createChatId();
  const systemMsgId = createChatMessageId();
  const userMsgId = createChatMessageId();

  const systemContent = suggestionMessages.find((m) => m.role === "system")
    ?.content;
  const userContent = suggestionMessages.find((m) => m.role === "user")?.content;
  if (typeof systemContent !== "string" || typeof userContent !== "string") {
    return NextResponse.json(
      { error: "Invalid prompt construction" },
      { status: 500 },
    );
  }

  await db.insert(chats).values({
    id: chatId,
    userId,
    type: SHOT_SUGGESTION_CHAT_TYPE,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(chatMessages).values([
    {
      id: systemMsgId,
      chatId,
      messageIndex: 0,
      role: "system",
      content: systemContent,
      modelIdentifier: null,
      tokenCount: null,
      metadata: { beanId },
      createdAt: new Date(),
    },
    {
      id: userMsgId,
      chatId,
      messageIndex: 1,
      role: "user",
      content: userContent,
      modelIdentifier: null,
      tokenCount: null,
      metadata: null,
      createdAt: new Date(),
    },
  ]);

  try {
    const result = await generateText({
      model,
      messages: suggestionMessages,
    });

    const assistantId = createChatMessageId();
    const usage = result.totalUsage;
    const tokenCount =
      usage.totalTokens ??
      (usage.inputTokens != null && usage.outputTokens != null
        ? usage.inputTokens + usage.outputTokens
        : undefined);

    await db.transaction(async (tx) => {
      await tx.insert(chatMessages).values({
        id: assistantId,
        chatId,
        messageIndex: 2,
        role: "assistant",
        content: result.text,
        modelIdentifier: config.openaiModel,
        tokenCount: tokenCount ?? null,
        metadata: {
          finishReason: result.finishReason,
          usage: result.totalUsage,
        },
        createdAt: new Date(),
      });

      await tx
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, chatId));

      if (access.userBean) {
        await tx
          .update(beansShare)
          .set({
            chatId,
            updatedAt: new Date(),
          })
          .where(eq(beansShare.id, access.userBean.id));
      }
    });

    const usedAfter = usedBefore + 1;
    const responseBody = createAiChatResponseSchema.parse({
      suggestion: result.text,
      chatId,
      usedThisWeek: usedAfter,
      weeklyLimit,
    });

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    await db.delete(chats).where(eq(chats.id, chatId));

    const message =
      err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json(
      {
        error: message,
        code: "ai_generation_failed",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beanId = request.nextUrl.searchParams.get("beanId");
  if (!beanId) {
    return NextResponse.json(
      { error: "beanId query parameter is required" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  const rows = await db
    .select({
      chatId: chats.id,
      suggestion: chatMessages.content,
      createdAt: chats.createdAt,
    })
    .from(chats)
    .innerJoin(
      chatMessages,
      and(
        eq(chatMessages.chatId, chats.id),
        eq(chatMessages.role, "assistant"),
      ),
    )
    .where(
      and(
        eq(chats.userId, userId),
        eq(chats.type, SHOT_SUGGESTION_CHAT_TYPE),
        sql`${chats.id} IN (
          SELECT ${chatMessages.chatId} FROM ${chatMessages}
          WHERE ${chatMessages.metadata}->>'beanId' = ${beanId}
        )`,
      ),
    )
    .orderBy(desc(chats.createdAt))
    .limit(20);

  const items = rows.map((r) =>
    aiChatHistoryItemSchema.parse({
      chatId: r.chatId,
      suggestion: r.suggestion,
      createdAt: r.createdAt.toISOString(),
    }),
  );

  return NextResponse.json({ items });
}
