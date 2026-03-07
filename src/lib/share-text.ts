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

export type ShareFormat = "short" | "standard" | "ridiculous";



// ─── Share-text templates ────────────────────────────────────────────
// Each {placeholder} is resolved from shot data.  Lines where EVERY
// placeholder resolved to "" are automatically dropped, so a conditional
// field just needs to return "" to vanish.
//
// Whole sections ({beanSection}, etc.) are rendered from their own
// sub-template first, then inserted into TEMPLATE.  A section that
// resolves to "" collapses entirely (no stray blank lines).

const BEAN_SECTION = `\
🫘 {beanName}
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

{beanSection}

{recipeSection}

{resultsSection}

{tastingSection}

{notes}

{url}`;


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

/**
 * Build a short share text with just bean name, rating, and URL.
 */
export function buildShortShareText(shot: ShotShareData): string {
  const parts: string[] = [];

  if (shot.beanName) {
    parts.push(`🫘 ${shot.beanName}`);
  }

  if (shot.rating != null) {
    const ratingLabel = formatRating(shot.rating);
    if (ratingLabel) {
      parts.push(`Rating: ${ratingLabel}`);
    }
  }

  if (shot.url) {
    parts.push(shot.url);
  }

  return parts.join("\n");
}

/**
 * Build a ridiculously verbose share text with all details, jokes, and dramatic flair.
 */
export function buildRidiculousShareText(shot: ShotShareData, tempUnit: TempUnit = "F"): string {
  const v = buildVars(shot, tempUnit);
  const parts: string[] = [];

  // Dramatic opening
  parts.push("🌟 Journey before Destination! 🌟");
  parts.push("");
  parts.push("Prepare yourself for the most EXTRAORDINARY espresso shot documentation you've ever witnessed!");
  parts.push("");

  // Bean section with dramatic flair
  if (v.beanName) {
    parts.push("🫘 THE BEANS (The Foundation of Greatness)");
    parts.push(`✨ ${v.beanName} ✨`);
    if (v.beanOrigin || v.beanRoaster) {
      const originRoaster = [v.beanOrigin, v.beanRoaster].filter(Boolean).join(" · ");
      if (originRoaster) {
        parts.push(`   Hailing from: ${originRoaster}`);
      }
    }
    if (v.roastLevel || v.processingMethod || v.roastDate) {
      const meta = [v.roastLevel, v.processingMethod, v.roastDate].filter(Boolean).join(" · ");
      if (meta) {
        parts.push(`   Details: ${meta}`);
      }
    }
    parts.push("");
  }

  // Recipe section with dramatic commentary
  parts.push("📋 THE RECIPE (Where Magic Begins)");
  parts.push(`   Target: ${v.targetRecipe}`);
  if (v.targetRecipe.includes("1:2")) {
    parts.push("   (Ah, the classic 1:2 ratio — a timeless dance of coffee and water!)");
  }
  if (v.grindLevel || v.brewTemp || v.brewPressure) {
    const details = [v.grindLevel, v.brewTemp, v.brewPressure].filter(Boolean).join(" · ");
    if (details) {
      parts.push(`   Settings: ${details}`);
    }
  }
  if (v.grinderName || v.machineName) {
    const equipment = [v.grinderName, v.machineName].filter(Boolean).join(" · ");
    if (equipment) {
      parts.push(`   Equipment: ${equipment}`);
      parts.push("   (Because great coffee deserves great tools!)");
    }
  }
  parts.push("");

  // Results section with dramatic flair
  if (v.actualResult || v.quality) {
    parts.push("📊 THE RESULTS (The Moment of Truth)");
    if (v.actualResult) {
      parts.push(`   Actual: ${v.actualResult}`);
      if (v.actualResult.includes("1:2")) {
        parts.push("   (Perfectly balanced, as all things should be!)");
      } else if (v.actualResult.includes("1:1")) {
        parts.push("   (A ristretto! Bold, intense, not for the faint of heart!)");
      } else if (v.actualResult.includes("1:3")) {
        parts.push("   (A lungo! Smooth, mellow, taking the scenic route!)");
      }
    }
    if (v.quality) {
      parts.push(`   ${v.quality}`);
      if (v.quality.includes("5/5")) {
        parts.push("   (FLAWLESS VICTORY! This shot is legendary!)");
      } else if (v.quality.includes("4/5")) {
        parts.push("   (Excellence achieved! A shot to remember!)");
      } else if (v.quality.includes("3/5")) {
        parts.push("   (Solid work! Room for improvement, but still enjoyable!)");
      }
    }
    parts.push("");
  }

  // Tasting section with flowery descriptions
  if (v.rating || v.bitter || v.sour || v.body || v.flavors || v.adjectives) {
    parts.push("☕ THE TASTING NOTES (Where Poetry Meets Coffee)");
    if (v.rating) {
      parts.push(`   ${v.rating}`);
      if (v.rating.includes("Loved It")) {
        parts.push("   (This is the shot dreams are made of!)");
      } else if (v.rating.includes("Really Enjoyed")) {
        parts.push("   (A truly delightful experience!)");
      } else if (v.rating.includes("Enjoyed")) {
        parts.push("   (A pleasant cup, well executed!)");
      }
    }
    if (v.bitter) {
      parts.push(`   ${v.bitter}`);
      if (v.bitter.includes("1/5") || v.bitter.includes("2/5")) {
        parts.push("   (Barely any bitterness — smooth as silk!)");
      } else if (v.bitter.includes("4/5") || v.bitter.includes("5/5")) {
        parts.push("   (Bold bitterness — for those who like it strong!)");
      }
    }
    if (v.sour) {
      parts.push(`   ${v.sour}`);
      if (v.sour.includes("1/5") || v.sour.includes("2/5")) {
        parts.push("   (Minimal acidity — mellow and gentle!)");
      } else if (v.sour.includes("4/5") || v.sour.includes("5/5")) {
        parts.push("   (Bright acidity — zingy and vibrant!)");
      }
    }
    if (v.body) {
      parts.push(`   ${v.body}`);
      parts.push("   (The texture tells a story of extraction mastery!)");
    }
    if (v.flavors) {
      parts.push(`   Flavors: ${v.flavors}`);
      parts.push("   (A symphony of taste notes dancing on the palate!)");
    }
    if (v.adjectives) {
      parts.push(`   Descriptors: ${v.adjectives}`);
      parts.push("   (Words that capture the essence of this brew!)");
    }
    parts.push("");
  }

  // Notes with dramatic flair
  if (v.notes) {
    parts.push("💭 THE NOTES (Wisdom from the Brewer)");
    parts.push(`   ${v.notes}`);
    parts.push("   (These words capture the soul of this shot!)");
    parts.push("");
  }

  // Haiku section
  const haikus = [
    "Steam rises gently\nDark liquid flows like honey\nMorning's perfect start",
    "Grind the beans with care\nWater meets coffee grounds\nMagic in a cup",
    "First sip of the day\nRich crema swirls in my cup\nLife begins anew",
    "Espresso machine\nHums with anticipation\nPerfection awaits",
    "Bitter and complex\nSweet notes dance on my tongue\nCoffee's poetry",
    "Dark roast, bold flavor\nEach shot tells its own story\nBrewer's art revealed",
    "Steam curls in the air\nAroma fills the kitchen\nCoffee ritual",
    "Perfect extraction\nGolden crema crowns the shot\nBarista's triumph",
    "Morning's first coffee\nWarms the soul and wakes the mind\nSimple perfection",
    "From bean to cup now\nA journey of transformation\nCoffee's alchemy",
  ];
  
  // Randomly select a haiku for each share
  const haikuIndex = Math.floor(Math.random() * haikus.length);
  const selectedHaiku = haikus[haikuIndex];
  
  parts.push("🌸 A HAIKU FOR THIS SHOT 🌸");
  parts.push("");
  parts.push(selectedHaiku);
  parts.push("");

  // Dramatic closing
  parts.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (v.url) {
    parts.push(`🔗 Full details: ${v.url}`);
  }
  parts.push("");
  parts.push("May your next shot be even more extraordinary!");
  parts.push("");

  // Random sign-off
  const signOffs = [
    "☕ Puck around and find out ☕",
    "☕ What the puck did I just pull ☕",
    "☕ Holy puck ☕",
    "☕ Puck it, close enough ☕",
    "☕ No pucks given ☕",
    "☕ What a time to be a puck ☕",
    "☕ Puck me that was good ☕",
    "☕ Straight outta the portafilter ☕",
    "☕ Pucking nailed it ☕",
    "☕ To puck and beyond ☕",
  ];
  const signOffIndex = Math.floor(Math.random() * signOffs.length);
  parts.push(signOffs[signOffIndex]);

  return parts.join("\n");
}

/**
 * Build share text based on the specified format.
 */
export function buildShareText(
  shot: ShotShareData,
  tempUnit: TempUnit = "F",
  format: ShareFormat = "standard",
): string {
  switch (format) {
    case "short":
      return buildShortShareText(shot);
    case "ridiculous":
      return buildRidiculousShareText(shot, tempUnit);
    case "standard":
    default:
      return buildShotShareText(shot, tempUnit);
  }
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
