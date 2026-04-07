import { describe, it, expect } from "vitest";
import { getUtcMondayStart } from "@/lib/ai-suggestions/utc-week";

describe("getUtcMondayStart", () => {
  it("returns Monday 00:00 UTC for a Wednesday", () => {
    const wed = new Date("2026-04-08T15:30:00.000Z");
    const start = getUtcMondayStart(wed);
    expect(start.toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });

  it("returns same Monday when already Monday 00:00 UTC", () => {
    const mon = new Date("2026-04-06T00:00:00.000Z");
    const start = getUtcMondayStart(mon);
    expect(start.toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });

  it("returns previous Monday for Sunday", () => {
    const sun = new Date("2026-04-05T12:00:00.000Z");
    const start = getUtcMondayStart(sun);
    expect(start.toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });
});
