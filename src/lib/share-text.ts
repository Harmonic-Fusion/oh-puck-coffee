/** Sharing text for the app.
 */
import { getRatingLabel, getRatingStars } from "@/lib/format-rating";
import { formatTemp, roundToOneDecimal, type TempUnit } from "@/lib/format-numbers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HAIKUS = [
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
] as const;

const SIGN_OFFS = [
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
] as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function joinParts(parts: (number | string | null | undefined)[], sep = " · "): string | null {
  const joined = parts.filter((p): p is string => !!p).map(p => p?.toString()).join(sep);
  return joined.length > 0 ? joined : null;
}

function filterLines(lines: (string | null | undefined)[]): string[] {
  return lines.filter((line): line is string => line != null);
}

function joinLines(lines: (string | null | undefined)[]): string {
  return filterLines(lines).join("\n") ?? "";
}

function sectionLines(conditional: unknown, lines: (string | null | undefined)[]): string[] {
  if (!conditional) return [];
  return [...filterLines(lines), ""];
}

function conditionalLines(conditional: unknown, lines: (string | null | undefined)[]): string[] {
  if (!conditional) return [];
  return filterLines(lines);
}

// ---------------------------------------------------------------------------
// View (shared base; ridiculous adds extra fields)
// ---------------------------------------------------------------------------

function buildView(shot: ShotShareData, tempUnit: TempUnit) {
  const beanName = shot.beanName ?? "";
  const beanOrigin = shot.beanOrigin ?? "";
  const beanRoaster = shot.beanRoaster ?? "";
  const roastLevel = shot.beanRoastLevel ? `${shot.beanRoastLevel} roast` : null;
  const processingMethod = shot.beanProcessingMethod ?? null;
  const roastDate = shot.beanRoastDate ? `Roasted ${shot.beanRoastDate}` : null;

  const targetRatio =
    shot.doseGrams > 0 ? roundToOneDecimal(shot.yieldGrams / shot.doseGrams) : null;
  const targetRatioPart = targetRatio ? ` (1:${targetRatio})` : "";
  const targetRecipe = `${roundToOneDecimal(shot.doseGrams)}g → ${roundToOneDecimal(shot.yieldGrams)}g${targetRatioPart}`;

  const brewTemp = formatTemp(shot.brewTempC, tempUnit) ?? null;
  const brewPressure =
    shot.brewPressure != null && shot.brewPressure !== 9
      ? `${roundToOneDecimal(shot.brewPressure)} bar`
      : null;

  const hasActual = shot.yieldActualGrams != null || shot.brewTimeSecs != null;
  let actualResult = null;
  if (hasActual) {
    const actualYield = shot.yieldActualGrams ?? shot.yieldGrams;
    const actualRatio =
      shot.doseGrams > 0 ? roundToOneDecimal(actualYield / shot.doseGrams) : '';
    const actualRatioPart = actualRatio ? ` (1:${actualRatio})` : '';
    const timePart =
      shot.brewTimeSecs != null ? ` in ${roundToOneDecimal(shot.brewTimeSecs)}s` : '';
    actualResult = `${roundToOneDecimal(shot.doseGrams)}g → ${roundToOneDecimal(actualYield)}g${actualRatioPart}${timePart}`;
  }

  const quality = shot.shotQuality != null ? `Quality ${shot.shotQuality}/5` : null;
  const ratingLabel = shot.rating != null ? getRatingLabel(shot.rating) : null;
  const ratingStars = shot.rating != null ? getRatingStars(shot.rating) : null;
  const rating = shot.rating != null ? `Rating ${shot.rating}/5` : null;
  const bitter = shot.bitter != null ? `Bitter ${shot.bitter}/5` : null;
  const sour = shot.sour != null ? `Sour ${shot.sour}/5` : null;

  const bodyDisplay =
    shot.bodyTexture && shot.bodyTexture.length > 0
      ? shot.bodyTexture[shot.bodyTexture.length - 1]
      : null;
  const body = bodyDisplay ? `${bodyDisplay} body` : null;

  const flavorList = shot.flavors ?? [];
  const flavors = flavorList.length > 0 ? flavorList.slice(0, 6).join(", ") : null;
  const adjList = shot.adjectives ?? [];
  const adjectives = adjList.length > 0 ? adjList.join(", ") : null;


  const notesTruncated = shot.notes ?
    shot.notes.length > 80 ?
      `"${shot.notes.slice(0, 80)}..."` :
      `"${shot.notes}"` :
    null;

  return {
    beanName,
    beanOrigin,
    beanRoaster,
    targetRecipe,
    actualResult,
    quality,
    ratingLabel,
    ratingStars,
    rating,
    bitter,
    sour,
    body,
    flavors,
    adjectives,
    roastLevel,
    processingMethod,
    roastDate,
    targetRatio,
    brewTemp,
    brewPressure,
    notesTruncated,
  };
}

// ---------------------------------------------------------------------------
// Ridiculous format
// ---------------------------------------------------------------------------

function buildRidiculousView(base: ReturnType<typeof buildView>) {
  // Ridiculous recipe section
  const recipeMagic =
    base.targetRecipe.includes("1:2") ? "Ah, the classic 1:2 ratio — a timeless dance of coffee and water!" :
      base.targetRecipe.includes("1:1") ? "A ristretto! Bold, intense, not for the faint of heart!" :
        base.targetRecipe.includes("1:3") ? "A lungo! Smooth, mellow, taking the scenic route!" :
          "An unconventional ratio that is sure to be a surprise!";

  // Ridiculous actual result description
  const brewingDescription =
    base.actualResult?.includes("1:2") ? "Perfectly balanced, as all things should be!" :
      base.actualResult?.includes("1:1") ? "A ristretto! Bold, intense, not for the faint of heart!" :
        base.actualResult?.includes("1:3") ? "A lungo! Smooth, mellow, taking the scenic route!" :
          "An unconventional ratio that is sure to be a surprise!";

  const qualityDescription =
    base.quality?.includes("5/5") ? "FLAWLESS VICTORY! This shot is legendary!" :
      base.quality?.includes("4/5") ? "Excellence achieved! A shot to remember!" :
        base.quality?.includes("3/5") ? "Solid work! Room for improvement, but still enjoyable!" :
          base.quality?.includes("2/5") ? "A shot that is just okay. There is room for improvement." :
            base.quality?.includes("1/5") ? "A failure! This shot is a disaster!" :
              "An unknown quality that is sure to be a surprise!";

  // Ridiculous tasting section
  const ratingDescription =
    base.ratingLabel?.includes("Loved It") ? "This is the shot dreams are made of!" :
      base.ratingLabel?.includes("Really Enjoyed") ? "A truly delightful experience!" :
        base.ratingLabel?.includes("Enjoyed") ? "A pleasant cup, well executed!" :
          null;

  const bitterDescription =
    base.bitter?.includes("1/5") || base.bitter?.includes("2/5") ? "Barely any bitterness — smooth as silk!" :
      base.bitter?.includes("4/5") || base.bitter?.includes("5/5") ? "Bold bitterness — for those who like it strong!" :
        null;

  const sourDescription =
    base.sour?.includes("1/5") || base.sour?.includes("2/5") ? "Minimal acidity — mellow and gentle!" :
      base.sour?.includes("4/5") || base.sour?.includes("5/5") ? "Bright acidity — zingy and vibrant!" :
        null;

  const bodyDescription =
    base.body ? "The texture tells a story of extraction mastery!" :
      null;

  const flavorsDescription =
    base.flavors ? "A symphony of taste notes dancing on the palate!" :
      null;

  const adjectivesDescription =
    base.adjectives ? "Words that capture the essence of this brew!" :
      null;

  return {
    ...base,
    recipeMagic,
    brewingDescription,
    qualityDescription,
    ratingDescription,
    bitterDescription,
    sourDescription,
    bodyDescription,
    flavorsDescription,
    adjectivesDescription,
  };
}


/**
 * Build share text for a shot.
 * Pipeline: shot data → view → Mustache template → rendered text.
 */
export function buildShareText(
  shot: ShotShareData,
  tempUnit: TempUnit = "F",
  format: ShareFormat = "standard",
): string {
  switch (format) {
    case "short":
      return buildShortShareText(shot);
    case "standard":
      return buildShotShareText(shot, tempUnit);
    case "ridiculous":
      return buildRidiculousShareText(shot, tempUnit);
    default:
      throw new Error(`Invalid format: ${format}`);
  }
}

/** Convenience: short format. */
export function buildShortShareText(shot: ShotShareData): string {
  const v = buildView(shot, "F");
  const shortText = joinLines([
    joinParts([v.ratingLabel, v.ratingStars, v.flavors], ' '),
    `🫘 ${v.beanName}`,
    v.notesTruncated,
  ]);
  return shortText;
}

/** Convenience: standard format. */
export function buildShotShareText(shot: ShotShareData, tempUnit: TempUnit = "F"): string {
  const v = buildView(shot, tempUnit);
  return joinLines([
    "Journey before Destination!",
    `${v.ratingLabel} ${v.ratingStars}`,
    v.notesTruncated,
    '',
    `🫘 ${v.beanName}`,
    joinParts([v.beanOrigin, v.beanRoaster]),
    joinParts([v.roastLevel, v.processingMethod, v.roastDate]),
    '',
    '📋 Recipe',
    v.targetRecipe,
    joinParts([shot.grinderName, shot.grindLevel]),
    joinParts([shot.machineName, v.brewTemp, v.brewPressure]),
    '',
    ...sectionLines(
      (v.actualResult || v.quality),
      [
        "🍵 Brewing",
        v.actualResult,
        v.quality,
      ]
    ),
    ...sectionLines(
      (v.rating || v.bitter || v.sour || v.body || v.flavors || v.adjectives),
      [
        "✨ Tasting Notes",
        joinParts([v.rating, v.ratingStars, v.ratingLabel]),
        v.bitter,
        v.sour,
        v.body,
        v.flavors,
        v.adjectives,
      ],
    ),
  ]);
}

/** Convenience: ridiculous format. */
export function buildRidiculousShareText(shot: ShotShareData, tempUnit: TempUnit = "F"): string {
  const v = buildRidiculousView(buildView(shot, tempUnit));
  return joinLines([
    "⛰️ Journey before Destination! ⛰️",
    "",
    "Prepare yourself for the most EXTRAORDINARY espresso shot documentation you've ever witnessed!",
    "",
    "This journey begins with the beans...",
    "🫘 THE BEANS",
    `✨ ${v.beanName} ✨`,
    ...conditionalLines(
      v.beanOrigin,
      [`Hailing from ${joinParts([v.beanOrigin, v.beanRoaster])}`]
    ),
    ...conditionalLines(
      v.roastLevel,
      [`These beans are ${joinParts([v.roastLevel, v.processingMethod, v.roastDate])}`]
    ),
    "",
    "Our hero plans their journey...",
    "📋 THE RECIPE",
    v.targetRecipe,
    v.recipeMagic,
    "",
    ...sectionLines(
      (v.actualResult || v.quality),
      [
        "In the moment of truth...",
        "🍵 HERO'S BREWING",
        "The hero's brew was...",
        v.actualResult,
        v.brewingDescription,
        v.quality,
        v.qualityDescription,
      ]
    ),
    "The final taste is where the magic ends...",
    ...sectionLines(
      (v.rating || v.bitter || v.sour || v.body || v.flavors || v.adjectives),
      [
        "🍵 HERO'S TASTING",
        v.rating,
        v.ratingDescription,
        ...conditionalLines(v.bitter, [`The hero's tasted a ${v.bitter}`, v.bitterDescription]),
        ...conditionalLines(v.sour, [`The hero's tasted a ${v.sour}`, v.sourDescription]),
        ...conditionalLines(v.body, [`The body of the shot was ${v.body}`, v.bodyDescription]),
        ...conditionalLines(v.flavors, [`The hero tasted ${v.flavors}`, v.flavorsDescription]),
        ...conditionalLines(v.adjectives, [`The shot was described as ${v.adjectives}`, v.adjectivesDescription]),
      ]
    ),
    ...sectionLines(
      (v.notesTruncated),
      [
        "💭 THE NOTES (Wisdom from the Brewer)",
        v.notesTruncated,
      ]
    ),
    "🌸 A HAIKU FOR THIS SHOT 🌸",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    pick(HAIKUS),
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "Until next time...",
    pick(SIGN_OFFS),
  ]);
}
