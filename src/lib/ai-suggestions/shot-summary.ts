import * as z from "zod";
import type { shots } from "@/db/schema";
import { ShotSummarySchema } from "@/lib/ai-suggestions/prompts";

function parseNumeric(value: string | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Maps a Drizzle `shots` row into prompt input. PG `numeric` columns arrive as strings.
 */
export function shotRowToSummaryInput(
  row: typeof shots.$inferSelect,
): z.infer<typeof ShotSummarySchema> {
  return ShotSummarySchema.parse({
    doseGrams: parseNumeric(row.doseGrams),
    yieldGrams: parseNumeric(row.yieldGrams),
    grindLevel: parseNumeric(row.grindLevel),
    brewTempC: parseNumeric(row.brewTempC),
    brewTimeSecs: parseNumeric(row.brewTimeSecs),
    yieldActualGrams: parseNumeric(row.yieldActualGrams),
    brewPressure: parseNumeric(row.brewPressure),
    preInfusionDuration: parseNumeric(row.preInfusionDuration),
    flowRate: parseNumeric(row.flowRate),
    rating: parseNumeric(row.rating),
    shotQuality: parseNumeric(row.shotQuality),
    bitter: parseNumeric(row.bitter),
    sour: parseNumeric(row.sour),
    flavors: row.flavors ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
  });
}
