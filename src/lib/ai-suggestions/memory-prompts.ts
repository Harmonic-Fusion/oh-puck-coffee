import type { ModelMessage } from "ai";

/**
 * Server-only prompts for background markdown memory (not metered).
 * Outputs should be concise markdown suitable for later injection into shot-suggestion prompts.
 */

export function buildUserMemoryMessages(input: {
  shotsJson: string;
}): ModelMessage[] {
  return [
    {
      role: "system",
      content:
        "You maintain a short markdown profile of this home barista's espresso habits and taste goals. " +
        "Use only the JSON shot data provided. Infer preferred equipment patterns, typical dose/yield ranges, " +
        "how they describe balance (bitter/sour), and stated flavor goals. " +
        "Do not invent facts not supported by the data. " +
        "Output markdown with clear headings (e.g. ## Equipment, ## Taste, ## Dialing style). " +
        "Keep it under roughly 400 words.",
    },
    {
      role: "user",
      content: `Recent shots (JSON, most recent first):\n${input.shotsJson}`,
    },
  ];
}

export function buildBeansMemoryMessages(input: {
  beanName: string;
  roastLevel: string;
  originLine: string;
  shotsJson: string;
}): ModelMessage[] {
  return [
    {
      role: "system",
      content:
        "You maintain a markdown profile of this coffee bean as observed across shots logged in the app. " +
        "Summarize typical recipe ranges, extraction behavior (time, ratios), and subjective notes when present. " +
        "Do not invent origin details beyond what is given. " +
        "Output markdown with headings (e.g. ## Overview, ## Typical ranges, ## In the data). " +
        "Keep it under roughly 400 words.",
    },
    {
      role: "user",
      content:
        `Bean: ${input.beanName}\n` +
        `Roast: ${input.roastLevel}\n` +
        `Origin / details: ${input.originLine}\n\n` +
        `Shots (JSON, most recent first):\n${input.shotsJson}`,
    },
  ];
}
