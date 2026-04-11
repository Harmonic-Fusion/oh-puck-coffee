import { NextResponse } from "next/server";
import { generateText } from "ai";
import { asc, eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  buildEquipmentSearchUserPrompt,
  EQUIPMENT_SEARCH_BATCH_SYSTEM,
} from "@/lib/ai-suggestions/equipment-search-prompt";
import { createSuggestionLanguageModel } from "@/lib/ai-suggestions/model";
import { parseJsonFromModelText } from "@/lib/ai-suggestions/parse-model-json";
import { config } from "@/shared/config";
import {
  adminAiEquipmentCandidateSchema,
  adminEquipmentSearchRequestSchema,
} from "@/shared/equipment/schema";
import { db } from "@/db";
import { equipment } from "@/db/schema";

const EXISTING_FOR_PROMPT_LIMIT = 500;

export async function POST(request: Request) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
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

  const parsedReq = adminEquipmentSearchRequestSchema.safeParse(json);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsedReq.error.flatten() },
      { status: 400 },
    );
  }

  const { type, count, brand, context } = parsedReq.data;

  const existingRows = await db
    .select({
      name: equipment.name,
      brand: equipment.brand,
    })
    .from(equipment)
    .where(eq(equipment.type, type))
    .orderBy(asc(equipment.name))
    .limit(EXISTING_FOR_PROMPT_LIMIT);

  const existingItems = existingRows.map((r) => ({
    name: r.name,
    brand: r.brand,
  }));

  const userPrompt = buildEquipmentSearchUserPrompt({
    type,
    count,
    brand: brand?.trim() ? brand : undefined,
    context: context?.trim() ? context : undefined,
    existingItems,
  });

  let text: string;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: EQUIPMENT_SEARCH_BATCH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });
    text = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let raw: unknown;
  try {
    raw = parseJsonFromModelText(text);
  } catch {
    return NextResponse.json(
      { error: "AI did not return valid JSON", model: config.openaiModel },
      { status: 502 },
    );
  }

  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "AI must return a JSON array", model: config.openaiModel },
      { status: 502 },
    );
  }

  const candidates: ReturnType<typeof adminAiEquipmentCandidateSchema.parse>[] = [];
  for (const item of raw) {
    const normalized =
      item && typeof item === "object" && !Array.isArray(item)
        ? { ...(item as Record<string, unknown>), type }
        : item;
    const candidate = adminAiEquipmentCandidateSchema.safeParse(normalized);
    if (!candidate.success) {
      continue;
    }
    candidates.push({ ...candidate.data, type });
    if (candidates.length >= count) {
      break;
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error: "AI response had no valid candidates",
        model: config.openaiModel,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    candidates,
    prompt: userPrompt,
  });
}
