import { describe, it, expect } from "vitest";
import { buildShotSuggestionMessages } from "@/lib/ai-suggestions/prompts";

describe("buildShotSuggestionMessages", () => {
  it("returns system and user messages with expected roles", () => {
    const messages = buildShotSuggestionMessages({
      beanName: "Ethiopia Guji",
      roastLevel: "Light",
      originName: "Ethiopia",
      processingMethod: "Natural",
      shotHistory: [
        {
          doseGrams: 18,
          yieldGrams: 36,
          grindLevel: 1.25,
          brewTempC: 93,
          brewTimeSecs: 28,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]?.role).toBe("user");
    const sys = messages[0]?.content;
    const usr = messages[1]?.content;
    expect(typeof sys).toBe("string");
    expect(typeof usr).toBe("string");
    expect(sys).toContain("Ethiopia Guji");
    expect(sys).toContain("Natural");
    expect(usr).toContain("Recent shots");
    expect(usr).toContain("18");
  });

  it("includes reference shot block when provided", () => {
    const messages = buildShotSuggestionMessages({
      beanName: "House Blend",
      roastLevel: "Medium",
      shotHistory: [],
      referenceShot: {
        doseGrams: 18,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
      },
    });
    const usr = messages[1]?.content;
    expect(typeof usr).toBe("string");
    expect(usr).toContain("Reference shot");
  });
});
