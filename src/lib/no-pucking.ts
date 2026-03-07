/**
 * Pre-compiled replacements to avoid re-allocation on every function call.
 */
const REPLACEMENTS: Record<string, string> = {
  fuck: "puck",
  fucking: "pucking",
  fucked: "pucked",
  fucker: "pucker",
  shit: "shot",
  shitty: "shotty",
  shat: "shot",
  bitch: "breve",
  bitches: "breves",
  damn: "decaf",
  damned: "decaf",
  hell: "hull",
  ass: "arabica",
  asshole: "arabica-hole",
  dick: "drip",
  dicks: "drips",
  pussy: "pour-over",
  piss: "pour",
  pissed: "poured",
  bastard: "barista",
  bastards: "baristas",
  slut: "sip",
  whore: "whole bean",
  bullshit: "bullshot",
  crap: "crema",
  motherfucker: "motherpucker",
  motherfucking: "motherpucking",
  wanker: "whisker",
  prick: "press",
  twat: "tamp",
  bollocks: "beans",
};

// Generate a single regex: \b(fuck|fucking|fucked|...)\b
// Sort by length descending to ensure "motherfucker" matches before "fucker"
const pattern = Object.keys(REPLACEMENTS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const CACHE_REGEX = new RegExp(`\\b(${pattern})\\b`, "gi");

/**
 * Replaces swear words with coffee-themed alternatives.
 * Optimized for single-pass execution.
 */
export function no_pucking_swearing(text: string): string {
  if (!text) return text;

  return text.replace(CACHE_REGEX, (match) => {
    const replacement = REPLACEMENTS[match.toLowerCase()];

    // 1. ALL CAPS
    if (match === match.toUpperCase()) {
      return replacement.toUpperCase();
    }
    // 2. Title Case (Pucking)
    if (match[0] === match[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    // 3. lowercase
    return replacement;
  });
}