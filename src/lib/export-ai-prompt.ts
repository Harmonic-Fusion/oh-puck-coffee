/**
 * Export shot history + beans as a text prompt for AI assistants.
 * Helps users paste their data into ChatGPT, Claude, etc. to get brewing advice.
 */

import { getRatingLabel } from "@/lib/format-rating";
import { format } from "date-fns";

/** Minimal shot shape needed for AI export (matches ShotWithJoins fields we use). */
export interface ShotForAiExport {
  id: string;
  createdAt: string;
  beanId: string;
  beanName: string | null;
  beanRoastDate: string | null;
  beanRoastLevel: string | null;
  doseGrams: string;
  yieldGrams: string;
  yieldActualGrams: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  grindLevel: string;
  brewRatio: number | null;
  grinderName: string | null;
  machineName: string | null;
  shotQuality: number;
  rating: number | null;
  bitter: number | null;
  sour: number | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  notes: string | null;
  isReferenceShot: boolean;
  toolsUsed: string[] | null;
  flowControl: string | null;
  flowRate: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  daysPostRoast: number | null;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n\n`;
}

function formatShot(shot: ShotForAiExport): string {
  const date = format(new Date(shot.createdAt), "yyyy-MM-dd HH:mm");
  const parts: string[] = [
    `Date: ${date}`,
    `Bean: ${shot.beanName ?? "—"}`,
    shot.beanRoastLevel ? `Roast: ${shot.beanRoastLevel}` : null,
    shot.beanRoastDate ? `Roast date: ${format(new Date(shot.beanRoastDate), "yyyy-MM-dd")}` : null,
    shot.daysPostRoast != null ? `Days post-roast: ${shot.daysPostRoast}` : null,
    `Dose: ${shot.doseGrams}g`,
    `Yield: ${shot.yieldGrams}g${shot.yieldActualGrams ? ` (actual ${shot.yieldActualGrams}g)` : ""}`,
    shot.brewRatio != null ? `Ratio: 1:${shot.brewRatio}` : null,
    shot.brewTimeSecs ? `Time: ${shot.brewTimeSecs}s` : null,
    shot.grindLevel ? `Grind: ${shot.grindLevel}` : null,
    shot.grinderName ? `Grinder: ${shot.grinderName}` : null,
    shot.machineName ? `Machine: ${shot.machineName}` : null,
    shot.brewTempC ? `Temp: ${shot.brewTempC}°C` : null,
    shot.preInfusionDuration ? `Pre-infusion: ${shot.preInfusionDuration}` : null,
    shot.brewPressure ? `Pressure: ${shot.brewPressure}` : null,
    shot.flowControl ? `Flow control: ${shot.flowControl}` : null,
    shot.flowRate ? `Flow rate: ${shot.flowRate}` : null,
    shot.toolsUsed?.length ? `Tools: ${shot.toolsUsed.join(", ")}` : null,
    `Quality score: ${shot.shotQuality}/10`,
    shot.rating != null ? `Rating: ${shot.rating}/5 (${getRatingLabel(shot.rating) ?? ""})` : null,
    shot.bitter != null ? `Bitter: ${shot.bitter}` : null,
    shot.sour != null ? `Sour: ${shot.sour}` : null,
    shot.flavors?.length ? `Flavors: ${shot.flavors.join(", ")}` : null,
    shot.bodyTexture?.length ? `Body: ${shot.bodyTexture.join(", ")}` : null,
    shot.adjectives?.length ? `Adjectives: ${shot.adjectives.join(", ")}` : null,
    shot.notes ? `Notes: ${shot.notes}` : null,
    shot.isReferenceShot ? "[Reference shot]" : null,
  ].filter((p): p is string => p != null && p !== "");
  return parts.join("\n");
}

/** Unique bean summary from shot list (by beanId). */
function buildBeansSection(shots: ShotForAiExport[]): string {
  const byBean = new Map<
    string,
    { name: string | null; roastDate: string | null; roastLevel: string | null; shotCount: number }
  >();
  for (const s of shots) {
    const existing = byBean.get(s.beanId);
    if (existing) {
      existing.shotCount += 1;
    } else {
      byBean.set(s.beanId, {
        name: s.beanName,
        roastDate: s.beanRoastDate,
        roastLevel: s.beanRoastLevel,
        shotCount: 1,
      });
    }
  }
  const lines = Array.from(byBean.entries()).map(([, b]) => {
    const parts = [
      `- ${b.name ?? "Unnamed bean"}`,
      b.roastLevel ? `  Roast: ${b.roastLevel}` : null,
      b.roastDate ? `  Roast date: ${format(new Date(b.roastDate), "yyyy-MM-dd")}` : null,
      `  Shots in this export: ${b.shotCount}`,
    ].filter((p): p is string => p != null);
    return parts.join("\n");
  });
  return lines.join("\n\n");
}

const INSTRUCTIONS = `You are helping a home barista understand their espresso shot history and improve their drinks. Use the shot history and beans reference below to:

1. **Spot patterns** – e.g. dose/yield/ratio, grind, time, and how they relate to quality and taste.
2. **Suggest adjustments** – when shots are under- or over-extracted, suggest concrete changes (grind, dose, yield, time, temperature).
3. **Bean-specific advice** – consider roast level and days post-roast when giving advice.
4. **Reference shots** – shots marked as [Reference shot] are ones they want to replicate; help them get there with other beans or equipment.

When answering, refer to specific shots by date and bean when relevant.`;

/**
 * Build the full AI prompt text: instructions, shot history, and beans reference.
 */
export function buildAiExportPrompt(shots: ShotForAiExport[]): string {
  const intro =
    "Below is my espresso shot history and a list of beans I use. Please use this to help me understand my shots and pull better drinks.\n";
  const instructionsBlock = section("Instructions for the AI", INSTRUCTIONS);
  const shotBlocks = shots.map(
    (s) =>
      `### Shot ${format(new Date(s.createdAt), "yyyy-MM-dd HH:mm")} · ${s.beanName ?? "Unknown bean"}\n\n${formatShot(s)}`,
  );
  const shotHistoryBlock = section("Shot history", shotBlocks.join("\n\n---\n\n"));
  const beansBlock = section("Beans reference", buildBeansSection(shots));
  return intro + "\n" + instructionsBlock + shotHistoryBlock + beansBlock;
}

/**
 * Trigger download of the AI prompt as a .txt file.
 */
export function downloadAiPrompt(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
