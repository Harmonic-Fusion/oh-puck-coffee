import { generateText } from "ai";
import { db } from "@/db";
import {
  aiBeansMemory,
  aiUserMemory,
  beans,
  origins,
  shots,
  users,
} from "@/db/schema";
import { createAiBeansMemoryId, createAiUserMemoryId } from "@/lib/nanoid-ids";
import { config } from "@/shared/config";
import { and, desc, eq } from "drizzle-orm";
import { createSuggestionLanguageModel } from "./model";
import {
  buildBeansMemoryMessages,
  buildUserMemoryMessages,
} from "./memory-prompts";
import { shotRowToSummaryInput } from "./shot-summary";

const SHOT_ROWS_LIMIT = 40;

/** Does not create `chats` rows — safe for background jobs (no quota). */
export async function refreshAiUserMemory(userId: string): Promise<void> {
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    throw new Error("User not found");
  }

  const rows = await db
    .select({
      shot: shots,
      beanName: beans.name,
    })
    .from(shots)
    .innerJoin(beans, eq(shots.beanId, beans.id))
    .where(and(eq(shots.userId, userId), eq(shots.isHidden, false)))
    .orderBy(desc(shots.createdAt))
    .limit(SHOT_ROWS_LIMIT);

  if (rows.length === 0) {
    await upsertAiUserMemoryRow(
      userId,
      "_No shots logged yet. This summary will update after you log espresso shots._",
      null,
    );
    return;
  }

  const model = createSuggestionLanguageModel();
  if (!model) {
    throw new Error("AI is not configured");
  }

  const payload = rows.map((r) => ({
    beanName: r.beanName,
    ...shotRowToSummaryInput(r.shot),
  }));

  const messages = buildUserMemoryMessages({
    shotsJson: JSON.stringify(payload),
  });

  const result = await generateText({
    model,
    messages,
  });

  await upsertAiUserMemoryRow(userId, result.text.trim(), config.openaiModel);
}

/** Aggregates non-hidden shots for this bean (all users). Does not create `chats` rows. */
export async function refreshAiBeansMemory(beanId: string): Promise<void> {
  const [beanRow] = await db.select().from(beans).where(eq(beans.id, beanId)).limit(1);

  if (!beanRow) {
    throw new Error("Bean not found");
  }

  let originLine = "";
  if (beanRow.originId) {
    const [o] = await db
      .select({ name: origins.name })
      .from(origins)
      .where(eq(origins.id, beanRow.originId))
      .limit(1);
    originLine = o?.name ?? "";
  }
  if (beanRow.originDetails) {
    originLine = originLine
      ? `${originLine}; ${beanRow.originDetails}`
      : beanRow.originDetails;
  }
  if (beanRow.processingMethod) {
    originLine = originLine
      ? `${originLine}; ${beanRow.processingMethod}`
      : beanRow.processingMethod;
  }

  const shotRows = await db
    .select()
    .from(shots)
    .where(and(eq(shots.beanId, beanId), eq(shots.isHidden, false)))
    .orderBy(desc(shots.createdAt))
    .limit(SHOT_ROWS_LIMIT);

  if (shotRows.length === 0) {
    await upsertAiBeansMemoryRow(
      beanId,
      "_No shots logged for this bean yet. This profile will update once shots exist in the app._",
      null,
    );
    return;
  }

  const model = createSuggestionLanguageModel();
  if (!model) {
    throw new Error("AI is not configured");
  }

  const payload = shotRows.map((row) => ({
    userId: row.userId,
    ...shotRowToSummaryInput(row),
  }));

  const messages = buildBeansMemoryMessages({
    beanName: beanRow.name,
    roastLevel: beanRow.roastLevel,
    originLine: originLine || "(not specified)",
    shotsJson: JSON.stringify(payload),
  });

  const result = await generateText({
    model,
    messages,
  });

  await upsertAiBeansMemoryRow(beanId, result.text.trim(), config.openaiModel);
}

async function upsertAiUserMemoryRow(
  userId: string,
  content: string,
  modelIdentifier: string | null,
): Promise<void> {
  const now = new Date();
  await db
    .insert(aiUserMemory)
    .values({
      id: createAiUserMemoryId(),
      userId,
      content,
      modelIdentifier,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiUserMemory.userId,
      set: {
        content,
        modelIdentifier,
        updatedAt: now,
      },
    });
}

async function upsertAiBeansMemoryRow(
  beanId: string,
  content: string,
  modelIdentifier: string | null,
): Promise<void> {
  const now = new Date();
  await db
    .insert(aiBeansMemory)
    .values({
      id: createAiBeansMemoryId(),
      beanId,
      content,
      modelIdentifier,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiBeansMemory.beanId,
      set: {
        content,
        modelIdentifier,
        updatedAt: now,
      },
    });
}
