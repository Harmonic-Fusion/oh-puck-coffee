/**
 * Build a descriptive summary text for sharing a shot via Web Share API or clipboard.
 *
 * Uses a template with conditional lines — each line helper returns a string or null,
 * and null lines are stripped out so there are no awkward blanks.
 */

import { formatRating } from "@/lib/format-rating";
import { formatTemp, roundToOneDecimal, type TempUnit } from "@/lib/format-numbers";

export interface ShotShareData {
  beanName?: string | null;
  beanRoastLevel?: string | null;
  beanOrigin?: string | null;
  beanRoaster?: string | null;
  beanRoastDate?: string | null;
  beanProcessingMethod?: string | null;
  shotQuality?: number | null;
  rating?: number | null;
  bitter?: number | null;
  sour?: number | null;
  doseGrams: number;
  yieldGrams: number;
  yieldActualGrams?: number | null;
  brewTimeSecs?: number | null;
  grindLevel?: number | null;
  brewTempC?: number | null;
  brewPressure?: number | null;
  grinderName?: string | null;
  machineName?: string | null;
  flavors?: string[] | null;
  bodyTexture?: string[] | null;
  adjectives?: string[] | null;
  notes?: string | null;
  url?: string | null;
}



// ─── Share-text templates ────────────────────────────────────────────
// Each {placeholder} is resolved from shot data.  Lines where EVERY
// placeholder resolved to "" are automatically dropped, so a conditional
// field just needs to return "" to vanish.
//
// Whole sections ({beanSection}, etc.) are rendered from their own
// sub-template first, then inserted into TEMPLATE.  A section that
// resolves to "" collapses entirely (no stray blank lines).

const BEAN_SECTION = `\
🫘 Beans
{beanName}
{beanOrigin} · {beanRoaster}
{roastLevel} · {processingMethod} · {roastDate}`;

const RECIPE_SECTION = `\
📋 Recipe
{targetRecipe}
{grindLevel} · {brewTemp} · {brewPressure}
{grinderName} · {machineName}`;

const RESULTS_SECTION = `\
📊 Results
{actualResult}
{quality}`;

const TASTING_SECTION = `\
☕ Tasting Notes
{rating}
{bitter}
{sour}
{body}
{flavors}
{adjectives}`;

const TEMPLATE = `\
Journey before Destination!
{url}

{beanSection}

{recipeSection}

{resultsSection}

{tastingSection}

{notes}

`;


export function buildShotShareText(shot: ShotShareData, tempUnit: TempUnit = "F"): string {
  const v = buildVars(shot, tempUnit);

  // Each section renders its own sub-template (or "" when the gate is false).
  const beanSection = v.beanName ? renderTemplate(BEAN_SECTION, v) : "";
  const recipeSection = renderTemplate(RECIPE_SECTION, v);
  const resultsSection = (v.actualResult || v.quality)
    ? renderTemplate(RESULTS_SECTION, v)
    : "";
  const tastingSection = (v.rating || v.bitter || v.sour || v.body || v.flavors || v.adjectives)
    ? renderTemplate(TASTING_SECTION, v)
    : "";

  // Compose sections into the main template and collapse stray blank lines.
  return renderTemplate(TEMPLATE, {
    beanSection, recipeSection, resultsSection, tastingSection,
    notes: v.notes, url: v.url,
  });
}

// ---------------------------------------------------------------------------
// Derive all template variables from the shot data
// ---------------------------------------------------------------------------

interface TemplateVars {
  [key: string]: string | null;
  // Bean fields
  beanName: string | null;
  beanOrigin: string;
  beanRoaster: string;
  roastLevel: string;
  processingMethod: string;
  roastDate: string;
  // Recipe fields (target)
  targetRecipe: string;
  grindLevel: string;
  brewTemp: string;
  brewPressure: string;
  grinderName: string;
  machineName: string;
  // Results fields (actual)
  actualResult: string;
  quality: string;
  // Tasting fields (each on its own line)
  rating: string;
  bitter: string;
  sour: string;
  body: string;
  flavors: string;
  adjectives: string;
  // Notes
  notes: string;
  // Link
  url: string;
}

function buildVars(shot: ShotShareData, tempUnit: TempUnit): TemplateVars {
  // Beans
  const beanName = shot.beanName ?? null;
  const beanOrigin = shot.beanOrigin ?? "";
  const beanRoaster = shot.beanRoaster ?? "";
  const roastLevel = shot.beanRoastLevel ? `${shot.beanRoastLevel} roast` : "";
  const processingMethod = shot.beanProcessingMethod ?? "";
  const roastDate = shot.beanRoastDate ? `Roasted ${shot.beanRoastDate}` : "";

  // Recipe (target)
  const targetRatio = shot.doseGrams > 0
    ? roundToOneDecimal(shot.yieldGrams / shot.doseGrams)
    : null;
  const targetRatioPart = targetRatio ? ` (1:${targetRatio})` : "";
  const targetRecipe = `${roundToOneDecimal(shot.doseGrams)}g → ${roundToOneDecimal(shot.yieldGrams)}g${targetRatioPart}`;

  const grindLevel = shot.grindLevel != null ? `Grind ${shot.grindLevel}` : "";
  const brewTemp = formatTemp(shot.brewTempC, tempUnit) ?? "";
  const brewPressure = shot.brewPressure != null && shot.brewPressure !== 9
    ? `${roundToOneDecimal(shot.brewPressure)} bar`
    : "";
  const grinderName = shot.grinderName ?? "";
  const machineName = shot.machineName ?? "";

  // Results (actual)
  const hasActual = shot.yieldActualGrams != null || shot.brewTimeSecs != null;
  let actualResult = "";
  if (hasActual) {
    const actualYield = shot.yieldActualGrams ?? shot.yieldGrams;
    const actualRatio = shot.doseGrams > 0
      ? roundToOneDecimal(actualYield / shot.doseGrams)
      : null;
    const actualRatioPart = actualRatio ? ` (1:${actualRatio})` : "";
    const timePart = shot.brewTimeSecs != null
      ? ` in ${roundToOneDecimal(shot.brewTimeSecs)}s`
      : "";
    actualResult = `${roundToOneDecimal(shot.doseGrams)}g → ${roundToOneDecimal(actualYield)}g${actualRatioPart}${timePart}`;
  }

  const quality = shot.shotQuality != null ? `Quality ${shot.shotQuality}/5` : "";

  // Tasting (separate lines for each)
  const rating = shot.rating != null
    ? `Rating ${formatRating(shot.rating)}`
    : "";

  const bitter = shot.bitter != null
    ? `Bitter ${shot.bitter}/5`
    : "";

  const sour = shot.sour != null
    ? `Sour ${shot.sour}/5`
    : "";

  const bodyDisplay = shot.bodyTexture && shot.bodyTexture.length > 0
    ? shot.bodyTexture[shot.bodyTexture.length - 1]
    : null;
  const body = bodyDisplay ? `${bodyDisplay} body` : "";

  const flavorList = shot.flavors || [];
  const flavors = flavorList.length > 0 ? flavorList.slice(0, 6).join(", ") : "";

  const adjList = shot.adjectives || [];
  const adjectives = adjList.length > 0 ? adjList.join(", ") : "";

  // Notes (truncated at 80 chars, wrapped in quotes)
  const notes = shot.notes
    ? `"${shot.notes.length > 80 ? shot.notes.slice(0, 77) + "..." : shot.notes}"`
    : "";

  const url = shot.url ?? "";

  return {
    beanName, beanOrigin, beanRoaster, roastLevel, processingMethod, roastDate,
    targetRecipe, grindLevel, brewTemp, brewPressure, grinderName, machineName,
    actualResult, quality, rating, bitter, sour, body, flavors, adjectives,
    notes, url,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replace `{placeholders}` in a template string.
 *
 * - Lines where **every** placeholder resolved to `""` are dropped entirely.
 * - Orphaned ` · ` separators are cleaned up (leading, trailing, consecutive).
 * - After substitution, runs of 3+ consecutive newlines collapse to a single
 *   blank line so removed sections don't leave gaps.
 */
function renderTemplate(template: string, vars: Record<string, string | null>): string {
  return template
    .split("\n")
    .map((line) => {
      let hasPlaceholder = false;
      let allEmpty = true;

      const rendered = line.replace(/\{(\w+)\}/g, (_, key: string) => {
        hasPlaceholder = true;
        const val = vars[key] ?? "";
        if (val !== "") allEmpty = false;
        return val;
      });

      // Drop lines whose only content was placeholders that all resolved to ""
      if (hasPlaceholder && allEmpty) return null;

      // Clean up orphaned " · " separators from empty placeholders
      return cleanSeparators(rendered);
    })
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove leading, trailing, and consecutive ` · ` separators. */
function cleanSeparators(line: string): string {
  return line
    .split(" · ")
    .filter((part) => part.trim() !== "")
    .join(" · ");
}

function collectFlavors(
  categories?: Record<string, string[]> | null,
  adjectives?: string[] | null,
): string[] {
  const flavors: string[] = [];

  if (categories) {
    for (const paths of Object.values(categories)) {
      // Paths are now just node names, but handle old format for backward compatibility
      const leafFlavors = paths.map((path) => {
        // If it contains ":", it's old format - extract last part
        if (path.includes(":")) {
          const parts = path.split(":");
          return parts[parts.length - 1] || path;
        }
        // New format: just return the node name
        return path;
      });
      flavors.push(...leafFlavors);
    }
  }

  if (adjectives) {
    for (const adj of adjectives) {
      if (!flavors.includes(adj)) {
        flavors.push(adj);
      }
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(flavors));
}
