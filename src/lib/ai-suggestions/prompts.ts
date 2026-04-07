import * as z from "zod";
import type { ModelMessage } from "ai";

export const ShotSummarySchema = z.object({
  doseGrams: z.number().optional(),
  yieldGrams: z.number().optional(),
  grindLevel: z.number().optional(),
  brewTempC: z.number().optional(),
  brewTimeSecs: z.number().optional(),
  yieldActualGrams: z.number().optional(),
  brewPressure: z.number().optional(),
  preInfusionDuration: z.number().optional(),
  flowRate: z.number().optional(),
  rating: z.number().optional(),
  shotQuality: z.number().optional(),
  bitter: z.number().optional(),
  sour: z.number().optional(),
  flavors: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
});

export const SuggestionPromptVarsSchema = z.object({
  beanName: z.string(),
  roastLevel: z.string(),
  originName: z.string().optional(),
  processingMethod: z.string().optional(),
  shotHistory: z.array(ShotSummarySchema).max(15),
  referenceShot: ShotSummarySchema.optional(),
  userMemory: z.string().optional(),
  beanMemory: z.string().optional(),
});

export type SuggestionPromptVars = z.infer<typeof SuggestionPromptVarsSchema>;

function formatShotLine(s: z.infer<typeof ShotSummarySchema>, index: number): string {
  const parts: string[] = [`Shot ${index + 1} (${s.createdAt.toISOString()})`];
  const recipe: string[] = [];
  if (s.doseGrams != null) recipe.push(`dose ${s.doseGrams}g`);
  if (s.yieldGrams != null) recipe.push(`yield ${s.yieldGrams}g`);
  if (s.grindLevel != null) recipe.push(`grind ${s.grindLevel}`);
  if (s.brewTempC != null) recipe.push(`${s.brewTempC}°C`);
  if (s.brewTimeSecs != null) recipe.push(`${s.brewTimeSecs}s`);
  if (s.yieldActualGrams != null) recipe.push(`actual yield ${s.yieldActualGrams}g`);
  if (s.brewPressure != null) recipe.push(`pressure ${s.brewPressure}`);
  if (s.preInfusionDuration != null) recipe.push(`pre-inf ${s.preInfusionDuration}s`);
  if (s.flowRate != null) recipe.push(`flow ${s.flowRate}`);
  if (recipe.length) parts.push(recipe.join(", "));
  const sense: string[] = [];
  if (s.rating != null) sense.push(`rating ${s.rating}`);
  if (s.shotQuality != null) sense.push(`quality ${s.shotQuality}`);
  if (s.bitter != null) sense.push(`bitter ${s.bitter}`);
  if (s.sour != null) sense.push(`sour ${s.sour}`);
  if (sense.length) parts.push(sense.join(", "));
  if (s.flavors?.length) parts.push(`flavors: ${s.flavors.join(", ")}`);
  if (s.notes?.trim()) parts.push(`notes: ${s.notes.trim()}`);
  return parts.join(" — ");
}

function formatReference(ref: z.infer<typeof ShotSummarySchema>): string {
  return `Reference shot — ${formatShotLine(ref, 0)}`;
}

/**
 * Builds OpenAI-compatible messages for a single-turn dialing-in suggestion.
 */
export function buildShotSuggestionMessages(vars: SuggestionPromptVars): ModelMessage[] {
  const validated = SuggestionPromptVarsSchema.parse(vars);

  const originPart = validated.originName
    ? ` (${validated.roastLevel}, ${validated.originName})`
    : ` (${validated.roastLevel})`;

  const system = [
    "You are an espresso dialing-in coach.",
    `The user is working with ${validated.beanName}${originPart}.`,
    validated.processingMethod
      ? `Processing: ${validated.processingMethod}.`
      : null,
    "Analyze trends in extraction (bitter/sour balance, flow rate, brew time) from the shot data below.",
    "Suggest specific parameter adjustments for the next shot. Be concise and actionable.",
    validated.referenceShot
      ? "Reference the user's marked reference shot when it helps."
      : null,
    validated.userMemory
      ? ["User preferences (markdown):\n", validated.userMemory].join("")
      : null,
    validated.beanMemory ? ["Bean profile (markdown):\n", validated.beanMemory].join("") : null,
  ]
    .filter(Boolean)
    .join(" ");

  const historyLines = validated.shotHistory.map((s, i) => formatShotLine(s, i));
  const userParts: string[] = [];
  if (validated.referenceShot) {
    userParts.push(formatReference(validated.referenceShot), "");
  }
  userParts.push("Recent shots (most recent first):", ...historyLines.map((l) => `- ${l}`));

  const user = userParts.join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
