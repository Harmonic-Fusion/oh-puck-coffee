/**
 * Build a descriptive summary text for sharing a shot via Web Share API or clipboard.
 *
 * Uses a template with conditional lines — each line helper returns a string or null,
 * and null lines are stripped out so there are no awkward blanks.
 */

export interface ShotShareData {
  beanName?: string | null;
  beanRoastLevel?: string | null;
  beanOrigin?: string | null;
  beanRoaster?: string | null;
  beanRoastDate?: string | null;
  beanProcessingMethod?: string | null;
  shotQuality: number;
  rating?: number | null;
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
}

export function buildShotShareText(shot: ShotShareData): string {
  const v = buildVars(shot);

  const lines: Array<string | null> = [
    // Title
    "Another excellent espresso adventure!",
    "",
    // Beans
    v.beanName    ? `🫘 ${v.beanName}` : null,
    v.beanDetails,
    v.beanMeta,
    v.beanName    ? "" : null,
    // Recipe
    `📋 ${v.recipe}`,
    v.recipeDetails,
    v.equipment,
    "",
    // Results
    `📊 ${v.scores}`,
    v.tasting,
    v.notes       ? `"${v.notes}"` : null,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

// ---------------------------------------------------------------------------
// Derive all template variables from the shot data
// ---------------------------------------------------------------------------

interface TemplateVars {
  beanName: string | null;
  beanDetails: string | null;
  beanMeta: string | null;
  recipe: string;
  recipeDetails: string | null;
  equipment: string | null;
  scores: string;
  tasting: string | null;
  notes: string | null;
}

function buildVars(shot: ShotShareData): TemplateVars {
  // Beans
  const beanName = shot.beanName ?? null;

  const beanDetails = joinParts([shot.beanOrigin, shot.beanRoaster]);

  const beanMeta = joinParts([
    shot.beanRoastLevel ? `${shot.beanRoastLevel} roast` : null,
    shot.beanProcessingMethod,
    shot.beanRoastDate ? `Roasted ${shot.beanRoastDate}` : null,
  ]);

  // Recipe
  const actualYield = shot.yieldActualGrams ?? shot.yieldGrams;
  const ratio = shot.doseGrams > 0 ? (actualYield / shot.doseGrams).toFixed(1) : null;
  const timePart = shot.brewTimeSecs != null ? ` in ${shot.brewTimeSecs}s` : "";
  const ratioPart = ratio ? ` (1:${ratio})` : "";
  const recipe = `${shot.doseGrams}g → ${actualYield}g${ratioPart}${timePart}`;

  const recipeDetails = joinParts([
    shot.grindLevel != null ? `Grind ${shot.grindLevel}` : null,
    shot.brewTempC != null ? `${shot.brewTempC}°C` : null,
    shot.brewPressure != null && shot.brewPressure !== 9 ? `${shot.brewPressure} bar` : null,
  ]);

  const equipment = joinParts([shot.grinderName, shot.machineName]);

  // Results
  const scores = joinParts([
    `Quality ${shot.shotQuality}/5`,
    shot.rating != null ? `Rating ${shot.rating}/5` : null,
  ]) ?? `Quality ${shot.shotQuality}/5`;

  // Tasting
  const flavors = shot.flavors || [];
  const bodyDisplay = shot.bodyTexture && shot.bodyTexture.length > 0
    ? shot.bodyTexture[shot.bodyTexture.length - 1]
    : null;
  const tasting = joinParts([
    flavors.length > 0 ? flavors.slice(0, 6).join(", ") : null,
    bodyDisplay ? `${bodyDisplay} body` : null,
  ]);

  // Notes (truncated at 80 chars)
  const notes = shot.notes
    ? (shot.notes.length > 80 ? shot.notes.slice(0, 77) + "..." : shot.notes)
    : null;

  return { beanName, beanDetails, beanMeta, recipe, recipeDetails, equipment, scores, tasting, notes };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Join non-null strings with " · ", or return null if all are empty. */
function joinParts(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(" · ") : null;
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
