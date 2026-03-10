import { describe, it, expect } from "vitest";
import {
  buildShotShareText,
  buildShortShareText,
  buildRidiculousShareText,
  buildShareText,
  type ShotShareData,
} from "@/lib/share-text";

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------

function makeShot(overrides: Partial<ShotShareData> = {}): ShotShareData {
  return {
    beanName: "Ethiopia Yirgacheffe",
    beanOrigin: "Guji",
    beanRoaster: "Onyx",
    beanRoastLevel: "Light",
    beanProcessingMethod: "Washed",
    beanRoastDate: "Jan 15, 2026",
    shotQuality: 4,
    rating: 5,
    doseGrams: 18,
    yieldGrams: 36,
    yieldActualGrams: 37.4,
    brewTimeSecs: 28.2,
    grindLevel: 2.5,
    brewTempC: 93,
    brewPressure: 6,
    grinderName: "Niche Zero",
    machineName: "Decent DE1",
    flavors: ["Blueberry", "Jasmine", "Honey"],
    bodyTexture: ["Silky"],
    adjectives: ["Clean", "Wild", "Sweet"],
    notes: "Fantastic shot, very sweet",
    url: "https://example.com/share/abc123",
    ...overrides,
  };
}

/** Asserts that share text rendered and does not contain the literal "null" (indicates bad escaping). */
function expectRendersWithoutNull(text: string): void {
  expect(typeof text).toBe("string");
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toContain("null");
}

// ---------------------------------------------------------------------------
// buildShotShareText
// ---------------------------------------------------------------------------

describe("buildShotShareText", () => {
  it("renders a full shot with all fields", () => {
    const text = buildShotShareText(makeShot(), "F");
    expectRendersWithoutNull(text);
    expect(text).toContain("📋 Recipe");
    expect(text).toContain("🍵 Brewing");
    expect(text).toContain("✨ Tasting Notes");
  });

  it("renders a minimal shot with only required fields", () => {
    const text = buildShotShareText({
      doseGrams: 18,
      yieldGrams: 36,
    });
    expectRendersWithoutNull(text);
    expect(text).toContain("📋 Recipe");
  });

  describe("bean section", () => {
    it("renders when bean fields are absent", () => {
      const text = buildShotShareText(
        makeShot({
          beanName: null,
          beanOrigin: null,
          beanRoaster: null,
          beanRoastLevel: null,
          beanProcessingMethod: null,
          beanRoastDate: null,
        })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("🫘");
    });

    it("renders when origin and roaster are absent", () => {
      const text = buildShotShareText(
        makeShot({ beanOrigin: null, beanRoaster: null })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("🫘 Ethiopia Yirgacheffe");
    });

    it("renders when roaster is absent", () => {
      const text = buildShotShareText(makeShot({ beanRoaster: null }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Guji");
    });

    it("renders when origin is absent", () => {
      const text = buildShotShareText(makeShot({ beanOrigin: null }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Onyx");
    });

    it("renders when meta fields are absent", () => {
      const text = buildShotShareText(
        makeShot({
          beanRoastLevel: null,
          beanProcessingMethod: null,
          beanRoastDate: null,
        })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("🫘 Ethiopia Yirgacheffe");
    });

    it("renders with partial meta", () => {
      const text = buildShotShareText(
        makeShot({ beanProcessingMethod: null, beanRoastDate: null })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("Light roast");
    });
  });

  describe("recipe section", () => {
    it("renders Recipe header and target recipe", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
      expect(text).toContain("📋 Recipe");
      expect(text).toContain("18g → 36g");
    });

    it("renders when yieldActualGrams differs from yieldGrams", () => {
      const text = buildShotShareText(
        makeShot({ yieldGrams: 36, yieldActualGrams: 40 })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("📋 Recipe");
    });

    it("renders when grind/temp/pressure are absent", () => {
      const text = buildShotShareText(
        makeShot({ grindLevel: null, brewTempC: null, brewPressure: null })
      );
      expectRendersWithoutNull(text);
    });

    it("renders with default brew pressure (9 bar)", () => {
      const text = buildShotShareText(makeShot({ brewPressure: 9 }));
      expectRendersWithoutNull(text);
    });

    it("renders with non-default brew pressure", () => {
      const text = buildShotShareText(makeShot({ brewPressure: 6 }));
      expectRendersWithoutNull(text);
      expect(text).toContain("6 bar");
    });

    it("renders when grinder and machine are absent", () => {
      const text = buildShotShareText(
        makeShot({ grinderName: null, machineName: null })
      );
      expectRendersWithoutNull(text);
    });

    it("renders when machine is absent", () => {
      const text = buildShotShareText(makeShot({ machineName: null }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Niche Zero");
    });
  });

  describe("results section", () => {
    it("renders actual result with yield and time", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: 37.4, brewTimeSecs: 28.2 })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("🍵 Brewing");
    });

    it("renders with only brew time", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: null, brewTimeSecs: 28 })
      );
      expectRendersWithoutNull(text);
    });

    it("renders with only actual yield", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: 40, brewTimeSecs: null })
      );
      expectRendersWithoutNull(text);
    });

    it("renders with quality", () => {
      const text = buildShotShareText(makeShot({ shotQuality: 4 }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Quality");
    });

    it("renders when no actual result and no quality", () => {
      const text = buildShotShareText(
        makeShot({
          yieldActualGrams: null,
          brewTimeSecs: null,
          shotQuality: null,
        })
      );
      expectRendersWithoutNull(text);
    });

    it("renders results section with only quality", () => {
      const text = buildShotShareText(
        makeShot({
          yieldActualGrams: null,
          brewTimeSecs: null,
          shotQuality: 3,
        })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("🍵 Brewing");
    });
  });

  describe("tasting section", () => {
    it("renders rating", () => {
      const text = buildShotShareText(makeShot({ rating: 5 }));
      expectRendersWithoutNull(text);
      expect(text).toContain("✨ Tasting Notes");
      expect(text).toContain("Loved It");
    });

    it("renders different rating label", () => {
      const text = buildShotShareText(makeShot({ rating: 3 }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Enjoyed");
    });

    it("renders body", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
      expect(text).toContain("Silky body");
    });

    it("renders flavors", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
      expect(text).toContain("Blueberry");
    });

    it("renders adjectives", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
      expect(text).toContain("Clean");
    });

    it("renders when all tasting fields are absent", () => {
      const text = buildShotShareText(
        makeShot({
          rating: null,
          flavors: null,
          bodyTexture: null,
          adjectives: null,
        })
      );
      expectRendersWithoutNull(text);
    });

    it("renders with only body", () => {
      const text = buildShotShareText(
        makeShot({
          rating: null,
          flavors: null,
          adjectives: null,
          bodyTexture: ["Creamy"],
        })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("✨ Tasting Notes");
      expect(text).toContain("Creamy body");
    });

    it("renders with many flavors (truncation)", () => {
      const text = buildShotShareText(
        makeShot({
          flavors: ["Alpha", "Beta", "Gamma", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"],
        })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("Alpha");
      expect(text).not.toContain("Golf");
    });

    it("renders last bodyTexture entry", () => {
      const text = buildShotShareText(
        makeShot({ bodyTexture: ["Light", "Medium", "Heavy"] })
      );
      expectRendersWithoutNull(text);
      expect(text).toContain("Heavy body");
    });
  });

  describe("notes", () => {
    it("renders notes in quotes", () => {
      const text = buildShotShareText(makeShot({ notes: "Great shot" }));
      expectRendersWithoutNull(text);
      expect(text).toContain("Great shot");
    });

    it("renders long notes (truncated)", () => {
      const longNote = "A".repeat(100);
      const text = buildShotShareText(makeShot({ notes: longNote }));
      expectRendersWithoutNull(text);
    });

    it("renders when notes are absent", () => {
      const text = buildShotShareText(makeShot({ notes: null }));
      expectRendersWithoutNull(text);
    });
  });

  describe("url", () => {
    it("renders when url is present", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
    });

    it("renders when url is absent", () => {
      const text = buildShotShareText(makeShot({ url: null }));
      expectRendersWithoutNull(text);
    });
  });

  describe("temp unit", () => {
    it("renders in Fahrenheit by default", () => {
      const text = buildShotShareText(makeShot({ brewTempC: 93 }));
      expectRendersWithoutNull(text);
      expect(text).toContain("°F");
    });

    it("renders in Celsius when specified", () => {
      const text = buildShotShareText(makeShot({ brewTempC: 93 }), "C");
      expectRendersWithoutNull(text);
      expect(text).toContain("°C");
    });
  });

  describe("blank line collapsing", () => {
    it("does not produce consecutive blank lines when sections are missing", () => {
      const text = buildShotShareText(
        makeShot({
          beanName: null,
          yieldActualGrams: null,
          brewTimeSecs: null,
          shotQuality: null,
          rating: null,
          flavors: null,
          bodyTexture: null,
          adjectives: null,
          notes: null,
          url: null,
        })
      );
      expectRendersWithoutNull(text);
      expect(text).not.toMatch(/\n{3,}/);
    });

    it("produces non-empty trimmed result", () => {
      const text = buildShotShareText(makeShot());
      expectRendersWithoutNull(text);
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// buildShortShareText
// ---------------------------------------------------------------------------

describe("buildShortShareText", () => {
  it("renders bean name, rating, and URL", () => {
    const text = buildShortShareText(makeShot());
    expectRendersWithoutNull(text);
    expect(text).toContain("Ethiopia Yirgacheffe");
    expect(text).toContain("Loved It");
  });

  it("renders only bean name when rating and URL are absent", () => {
    const text = buildShortShareText(makeShot({ rating: null, url: null, flavors: null, notes: null }));
    expectRendersWithoutNull(text);
    expect(text).toContain("Ethiopia Yirgacheffe");
  });

  it("renders only rating when bean name and URL are absent", () => {
    const text = buildShortShareText(makeShot({ beanName: null, url: null, flavors: null, notes: null }));
    expectRendersWithoutNull(text);
    expect(text).toContain("Loved It");
  });

  it("renders only URL when bean name and rating are absent", () => {
    const text = buildShortShareText(makeShot({ beanName: null, rating: null, flavors: null, notes: null }));
    expectRendersWithoutNull(text);
  });

  it("renders when all optional fields are absent", () => {
    const text = buildShortShareText({
      doseGrams: 18,
      yieldGrams: 36,
      beanName: "",
      rating: null,
      url: null,
      flavors: null,
      notes: null,
    });
    expectRendersWithoutNull(text);
  });

  it("renders different rating", () => {
    const text = buildShortShareText(makeShot({ rating: 3 }));
    expectRendersWithoutNull(text);
    expect(text).toContain("Enjoyed");
  });
});

// ---------------------------------------------------------------------------
// buildRidiculousShareText
// ---------------------------------------------------------------------------

describe("buildRidiculousShareText", () => {
  it("renders verbose version with all fields", () => {
    const text = buildRidiculousShareText(makeShot());
    expectRendersWithoutNull(text);
    expect(text).toContain("⛰️ Journey before Destination! ⛰️");
    expect(text).toContain("EXTRAORDINARY");
    expect(text).toContain("🫘 THE BEANS");
    expect(text).toContain("📋 THE RECIPE");
    expect(text).toContain("🍵 HERO'S BREWING");
    expect(text).toContain("🍵 HERO'S TASTING");
    expect(text).toContain("💭 THE NOTES");
  });

  it("renders with minimal shot data", () => {
    const text = buildRidiculousShareText({
      doseGrams: 18,
      yieldGrams: 36,
    });
    expectRendersWithoutNull(text);
    expect(text).toContain("⛰️ Journey before Destination! ⛰️");
    expect(text).toContain("📋 THE RECIPE");
    expect(text).toContain("18g → 36g");
  });

  it("includes dramatic commentary for 1:2 ratio", () => {
    const text = buildRidiculousShareText(makeShot());
    expectRendersWithoutNull(text);
    expect(text).toContain("1:2");
  });

  it("includes dramatic commentary for perfect quality", () => {
    const text = buildRidiculousShareText(makeShot({ shotQuality: 5 }));
    expectRendersWithoutNull(text);
    expect(text).toContain("FLAWLESS");
  });

  it("includes dramatic commentary for loved rating", () => {
    const text = buildRidiculousShareText(makeShot({ rating: 5 }));
    expectRendersWithoutNull(text);
    expect(text).toContain("dreams are made of");
  });

  it("includes link or details when url present", () => {
    const text = buildRidiculousShareText(makeShot());
    expectRendersWithoutNull(text);
  });
});

// ---------------------------------------------------------------------------
// buildShareText (dispatcher)
// ---------------------------------------------------------------------------

describe("buildShareText", () => {
  it("routes to short format when specified", () => {
    const text = buildShareText(makeShot(), "F", "short");
    expectRendersWithoutNull(text);
    expect(text).toContain("Ethiopia Yirgacheffe");
    expect(text).not.toContain("📋 Recipe");
  });

  it("routes to standard format when specified", () => {
    const text = buildShareText(makeShot(), "F", "standard");
    expectRendersWithoutNull(text);
    expect(text).toContain("📋 Recipe");
    expect(text).toContain("🍵 Brewing");
    expect(text).not.toContain("EXTRAORDINARY");
  });

  it("routes to ridiculous format when specified", () => {
    const text = buildShareText(makeShot(), "F", "ridiculous");
    expectRendersWithoutNull(text);
    expect(text).toContain("EXTRAORDINARY");
    expect(text).toContain("THE BEANS");
  });

  it("defaults to standard format", () => {
    const text = buildShareText(makeShot());
    expectRendersWithoutNull(text);
    expect(text).toContain("📋 Recipe");
    expect(text).not.toContain("EXTRAORDINARY");
  });
});
