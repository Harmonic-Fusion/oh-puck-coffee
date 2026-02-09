export const ROAST_LEVELS = [
  "Light",
  "Medium-Light",
  "Medium",
  "Medium-Dark",
  "Dark",
] as const;

export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const PROCESSING_METHODS = [
  "Washed",
  "Natural",
  "Honey",
  "Anaerobic",
  "Wet-Hulled",
  "Semi-Washed",
  "Carbonic Maceration",
  "Experimental",
] as const;

export type ProcessingMethod = (typeof PROCESSING_METHODS)[number];
