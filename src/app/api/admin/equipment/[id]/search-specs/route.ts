import { NextResponse } from "next/server";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  buildEquipmentSpecsSuggestUserPrompt,
  EQUIPMENT_SPECS_SUGGEST_SYSTEM,
} from "@/lib/ai-suggestions/equipment-search-prompt";
import { createSuggestionLanguageModel } from "@/lib/ai-suggestions/model";
import { parseJsonFromModelText } from "@/lib/ai-suggestions/parse-model-json";
import { config } from "@/shared/config";
import {
  adminAiEquipmentSpecsWrapperSchema,
  adminEquipmentSpecsSuggestRequestSchema,
} from "@/shared/equipment/schema";
import { db } from "@/db";
import { equipment } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id: equipmentId } = await params;

  const [eqRow] = await db
    .select({
      name: equipment.name,
      brand: equipment.brand,
      type: equipment.type,
      description: equipment.description,
      specs: equipment.specs,
    })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!eqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bodyJson: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) bodyJson = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedReq = adminEquipmentSpecsSuggestRequestSchema.safeParse(bodyJson);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsedReq.error.flatten() },
      { status: 400 },
    );
  }

  const currentSpecs =
    eqRow.specs &&
    typeof eqRow.specs === "object" &&
    !Array.isArray(eqRow.specs)
      ? (eqRow.specs as Record<string, unknown>)
      : null;

  const userPrompt = buildEquipmentSpecsSuggestUserPrompt({
    type: eqRow.type,
    name: eqRow.name,
    brand: eqRow.brand,
    description: eqRow.description,
    currentSpecs,
    extraContext: parsedReq.data.context?.trim() ? parsedReq.data.context : undefined,
  });

  let text: string;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: EQUIPMENT_SPECS_SUGGEST_SYSTEM },
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

  const parsed = adminAiEquipmentSpecsWrapperSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "AI response failed validation",
        details: parsed.error.flatten(),
        model: config.openaiModel,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    specs: parsed.data.specs,
    prompt: userPrompt,
  });
}
