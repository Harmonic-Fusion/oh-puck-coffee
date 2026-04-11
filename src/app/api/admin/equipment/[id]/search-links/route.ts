import { NextResponse } from "next/server";
import { generateText } from "ai";
import { requireSuperAdmin } from "@/lib/api-auth";
import { createSuggestionLanguageModel } from "@/lib/ai-suggestions/model";
import { parseJsonFromModelText } from "@/lib/ai-suggestions/parse-model-json";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { config } from "@/shared/config";
import { adminAiPurchaseLinksWrapperSchema } from "@/shared/equipment/schema";
import { eq } from "drizzle-orm";

const SYSTEM = `You are helping curate purchase links for coffee equipment. Reply with ONLY valid JSON (no markdown fences, no commentary) using this exact shape:
{"links":[{"marketplace":"string","baseUrl":"https://...","affiliateProgram":"string or null","priceUsd":number or null,"region":"string optional","isCanonical":boolean optional}]}
Rules:
- "links" is an array of plausible retailer listings (e.g. manufacturer site, major specialty coffee retailers, Amazon). Prefer HTTPS URLs.
- "baseUrl" must be a full product page URL.
- Omit affiliateProgram unless you are confident; use null otherwise.
- priceUsd is optional approximate USD if known, else null.
- region defaults to US if not specified per link.`;

function normalizeHttpsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // fall through
  }
  try {
    return new URL(`https://${t.replace(/^\/+/, "")}`).toString();
  } catch {
    return t;
  }
}

export async function POST(
  _request: Request,
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
    })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!eqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const context = [
    `Equipment type: ${eqRow.type}`,
    `Name: ${eqRow.name}`,
    eqRow.brand ? `Brand: ${eqRow.brand}` : "Brand: (unknown)",
    eqRow.description ? `Description: ${eqRow.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let text: string;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Find retailer product page URLs for this equipment:\n${context}`,
        },
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

  const parsed = adminAiPurchaseLinksWrapperSchema.safeParse(raw);
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

  const links = parsed.data.links
    .map((link) => {
      const baseUrl = normalizeHttpsUrl(link.baseUrl);
      try {
        new URL(baseUrl);
      } catch {
        return null;
      }
      return {
        marketplace: link.marketplace,
        baseUrl,
        affiliateProgram: link.affiliateProgram ?? null,
        priceUsd: link.priceUsd ?? null,
        region: link.region ?? "US",
        isCanonical: link.isCanonical ?? false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return NextResponse.json({ links });
}
