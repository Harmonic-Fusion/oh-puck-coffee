/**
 * Default tools seed data.
 * Tools are now stored in the database (tools table).
 * This array is used by the seed script only.
 */
export const DEFAULT_TOOLS = [
  {
    slug: "wdt",
    name: "WDT",
    description: "Weiss Distribution Technique — breaks up clumps in the puck with fine needles",
  },
  {
    slug: "puck-screen",
    name: "Puck Screen",
    description: "Metal screen placed on top of the puck to improve water distribution",
  },
  {
    slug: "rdt",
    name: "RDT",
    description: "Ross Droplet Technique — a spritz of water on beans to reduce static",
  },
  {
    slug: "dosing-cup",
    name: "Dosing Cup",
    description: "Dedicated cup for weighing and transferring coffee grounds",
  },
  {
    slug: "distribution-tool",
    name: "Distribution Tool",
    description: "Leveling tool spun on top of grounds for even distribution",
  },
  {
    slug: "tamper",
    name: "Tamper",
    description: "Compresses coffee grounds evenly in the portafilter",
  },
  {
    slug: "paper-filter",
    name: "Paper Filter",
    description: "Filter paper placed above or below the puck for clarity",
  },
  {
    slug: "leveler",
    name: "Leveler",
    description: "Calibrated flat tool for leveling the coffee bed",
  },
] as const;
