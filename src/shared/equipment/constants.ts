export const TOOLS = [
  "WDT",
  "Puck Screen",
  "RDT",
  "Dosing Cup",
  "Distribution Tool",
  "Tamper",
  "Paper Filter",
  "Leveler",
] as const;

export type Tool = (typeof TOOLS)[number];
