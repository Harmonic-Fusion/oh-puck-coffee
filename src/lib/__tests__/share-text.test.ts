import { describe, it, expect } from "vitest";
import { buildShotShareText, type ShotShareData } from "@/lib/share-text";

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

/** Shorthand: split output into non-blank lines for easier assertions. */
function lines(text: string): string[] {
  return text.split("\n").filter((l) => l.trim() !== "");
}

// ---------------------------------------------------------------------------
// Full-text checks
// ---------------------------------------------------------------------------

describe("buildShotShareText", () => {
  it("renders a full shot with all fields (exact text)", () => {
    const text = buildShotShareText(makeShot(), "F");

    expect(text).toBe(
      [
        "Journey before Destination!",
        "",
        "🫘 Ethiopia Yirgacheffe",
        "Guji · Onyx",
        "Light roast · Washed · Roasted Jan 15, 2026",
        "",
        "📋 Recipe",
        "18g → 36g (1:2)",
        "Grind 2.5 · 199.4°F · 6 bar",
        "Niche Zero · Decent DE1",
        "",
        "📊 Results",
        "18g → 37.4g (1:2.1) in 28.2s",
        "Quality 4/5",
        "",
        "☕ Tasting Notes",
        "Rating 5/5 *****",
        "Silky body",
        "Blueberry, Jasmine, Honey",
        "Clean, Wild, Sweet",
        "",
        '"Fantastic shot, very sweet"',
        "",
        "https://example.com/share/abc123",
      ].join("\n")
    );
  });

  it("renders a minimal shot with only required fields (exact text)", () => {
    const text = buildShotShareText({
      doseGrams: 18,
      yieldGrams: 36,
    });

    expect(text).toBe(
      [
        "Journey before Destination!",
        "",
        "📋 Recipe",
        "18g → 36g (1:2)",
      ].join("\n")
    );
  });

  // -----------------------------------------------------------------------
  // Bean section
  // -----------------------------------------------------------------------

  describe("bean section", () => {
    it("omits the entire bean section when beanName is absent", () => {
      const text = buildShotShareText(makeShot({ beanName: null }));
      expect(text).not.toContain("🫘");
      expect(text).not.toContain("Guji");
      expect(text).not.toContain("roast");
    });

    it("drops the details line when origin and roaster are both absent", () => {
      const text = buildShotShareText(
        makeShot({ beanOrigin: null, beanRoaster: null })
      );
      expect(text).toContain("🫘 Ethiopia Yirgacheffe");
      const output = lines(text);
      expect(output).not.toContainEqual(" · ");
    });

    it("shows only origin when roaster is absent", () => {
      const text = buildShotShareText(makeShot({ beanRoaster: null }));
      expect(text).toContain("Guji");
      expect(text).not.toContain("Guji · ");
    });

    it("shows only roaster when origin is absent", () => {
      const text = buildShotShareText(makeShot({ beanOrigin: null }));
      expect(text).toContain("Onyx");
      expect(text).not.toContain(" · Onyx");
    });

    it("drops the meta line when all meta fields are absent", () => {
      const text = buildShotShareText(
        makeShot({
          beanRoastLevel: null,
          beanProcessingMethod: null,
          beanRoastDate: null,
        })
      );
      expect(text).toContain("🫘 Ethiopia Yirgacheffe");
      expect(text).not.toContain("roast");
      expect(text).not.toContain("Roasted");
    });

    it("shows partial meta (e.g. only roast level)", () => {
      const text = buildShotShareText(
        makeShot({ beanProcessingMethod: null, beanRoastDate: null })
      );
      expect(text).toContain("Light roast");
      expect(text).not.toContain("Light roast · ");
    });
  });

  // -----------------------------------------------------------------------
  // Recipe section
  // -----------------------------------------------------------------------

  describe("recipe section", () => {
    it("shows the Recipe header and target recipe", () => {
      const text = buildShotShareText(makeShot());
      expect(text).toContain("📋 Recipe");
      expect(text).toContain("18g → 36g (1:2)");
    });

    it("target recipe always uses yieldGrams, not yieldActualGrams", () => {
      const text = buildShotShareText(
        makeShot({ yieldGrams: 36, yieldActualGrams: 40 })
      );
      // Recipe line uses target yield
      const recipeLines = text.split("📋 Recipe\n")[1].split("\n\n")[0];
      expect(recipeLines).toContain("18g → 36g");
    });

    it("target recipe does not include brew time", () => {
      const text = buildShotShareText(makeShot({ brewTimeSecs: 30 }));
      const recipeBlock = text.split("📋 Recipe\n")[1].split("\n\n")[0];
      expect(recipeBlock).not.toContain("in 30s");
    });

    it("drops recipe details line when no grind/temp/pressure", () => {
      const text = buildShotShareText(
        makeShot({ grindLevel: null, brewTempC: null, brewPressure: null })
      );
      expect(text).not.toContain("Grind");
      expect(text).not.toContain("°F");
      expect(text).not.toContain("bar");
    });

    it("omits brew pressure at 9 bar (default)", () => {
      const text = buildShotShareText(makeShot({ brewPressure: 9 }));
      expect(text).not.toContain("9 bar");
    });

    it("shows non-default brew pressure", () => {
      const text = buildShotShareText(makeShot({ brewPressure: 6 }));
      expect(text).toContain("6 bar");
    });

    it("drops equipment line when no grinder or machine", () => {
      const text = buildShotShareText(
        makeShot({ grinderName: null, machineName: null })
      );
      expect(text).not.toContain("Niche Zero");
      expect(text).not.toContain("Decent DE1");
    });

    it("shows only grinder when machine is absent", () => {
      const text = buildShotShareText(makeShot({ machineName: null }));
      expect(text).toContain("Niche Zero");
      expect(text).not.toContain("Niche Zero · ");
    });
  });

  // -----------------------------------------------------------------------
  // Results section
  // -----------------------------------------------------------------------

  describe("results section", () => {
    it("shows actual result with yield and time", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: 37.4, brewTimeSecs: 28.2 })
      );
      expect(text).toContain("📊 Results");
      expect(text).toContain("18g → 37.4g (1:2.1) in 28.2s");
    });

    it("shows actual result with only brew time (no actual yield)", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: null, brewTimeSecs: 28 })
      );
      expect(text).toContain("18g → 36g (1:2) in 28s");
    });

    it("shows actual result with only actual yield (no time)", () => {
      const text = buildShotShareText(
        makeShot({ yieldActualGrams: 40, brewTimeSecs: null })
      );
      expect(text).toContain("18g → 40g (1:2.2)");
      expect(text).not.toContain(" in ");
    });

    it("shows quality on its own line", () => {
      const text = buildShotShareText(makeShot({ shotQuality: 4 }));
      expect(text).toContain("Quality 4/5");
    });

    it("omits results section when no actual result and no quality", () => {
      const text = buildShotShareText(
        makeShot({
          yieldActualGrams: null,
          brewTimeSecs: null,
          shotQuality: null,
        })
      );
      expect(text).not.toContain("📊 Results");
    });

    it("shows results section with only quality (no actual result)", () => {
      const text = buildShotShareText(
        makeShot({
          yieldActualGrams: null,
          brewTimeSecs: null,
          shotQuality: 3,
        })
      );
      expect(text).toContain("📊 Results");
      expect(text).toContain("Quality 3/5");
    });
  });

  // -----------------------------------------------------------------------
  // Tasting section
  // -----------------------------------------------------------------------

  describe("tasting section", () => {
    it("shows rating with stars", () => {
      const text = buildShotShareText(makeShot({ rating: 5 }));
      expect(text).toContain("☕ Tasting Notes");
      expect(text).toContain("Rating 5/5 *****");
    });

    it("shows correct number of stars for rating", () => {
      const text = buildShotShareText(makeShot({ rating: 3 }));
      expect(text).toContain("Rating 3/5 ***");
      expect(text).not.toContain("****");
    });

    it("shows body on its own line", () => {
      const text = buildShotShareText(makeShot());
      expect(text).toContain("Silky body");
    });

    it("shows flavors on their own line", () => {
      const text = buildShotShareText(makeShot());
      const output = lines(text);
      expect(output).toContainEqual("Blueberry, Jasmine, Honey");
    });

    it("shows adjectives on their own line", () => {
      const text = buildShotShareText(makeShot());
      const output = lines(text);
      expect(output).toContainEqual("Clean, Wild, Sweet");
    });

    it("omits tasting section when all tasting fields are absent", () => {
      const text = buildShotShareText(
        makeShot({
          rating: null,
          flavors: null,
          bodyTexture: null,
          adjectives: null,
        })
      );
      expect(text).not.toContain("☕ Tasting Notes");
    });

    it("shows section with only body (no rating, flavors, adjectives)", () => {
      const text = buildShotShareText(
        makeShot({
          rating: null,
          flavors: null,
          adjectives: null,
          bodyTexture: ["Creamy"],
        })
      );
      expect(text).toContain("☕ Tasting Notes");
      expect(text).toContain("Creamy body");
      expect(text).not.toContain("Rating");
    });

    it("truncates flavors to 6 entries", () => {
      const text = buildShotShareText(
        makeShot({
          flavors: ["Alpha", "Beta", "Gamma", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"],
        })
      );
      expect(text).toContain("Alpha, Beta, Gamma, Delta, Echo, Foxtrot");
      expect(text).not.toContain("Golf");
    });

    it("uses the last entry in bodyTexture array", () => {
      const text = buildShotShareText(
        makeShot({ bodyTexture: ["Light", "Medium", "Heavy"] })
      );
      expect(text).toContain("Heavy body");
      expect(text).not.toContain("Light body");
    });
  });

  // -----------------------------------------------------------------------
  // Notes
  // -----------------------------------------------------------------------

  describe("notes", () => {
    it("wraps notes in quotes", () => {
      const text = buildShotShareText(makeShot({ notes: "Great shot" }));
      expect(text).toContain('"Great shot"');
    });

    it("truncates notes longer than 80 chars", () => {
      const longNote = "A".repeat(100);
      const text = buildShotShareText(makeShot({ notes: longNote }));
      expect(text).toContain(`"${"A".repeat(77)}..."`);
    });

    it("does not truncate notes at exactly 80 chars", () => {
      const note = "B".repeat(80);
      const text = buildShotShareText(makeShot({ notes: note }));
      expect(text).toContain(`"${note}"`);
    });

    it("drops notes line when notes are absent", () => {
      const text = buildShotShareText(makeShot({ notes: null }));
      expect(text).not.toContain('"');
    });
  });

  // -----------------------------------------------------------------------
  // URL
  // -----------------------------------------------------------------------

  describe("url", () => {
    it("includes the URL at the end", () => {
      const text = buildShotShareText(makeShot());
      const output = lines(text);
      expect(output[output.length - 1]).toBe(
        "https://example.com/share/abc123"
      );
    });

    it("omits URL line when url is absent", () => {
      const text = buildShotShareText(makeShot({ url: null }));
      expect(text).not.toContain("https://");
    });
  });

  // -----------------------------------------------------------------------
  // Temperature unit
  // -----------------------------------------------------------------------

  describe("temp unit", () => {
    it("formats temperature in Fahrenheit by default", () => {
      const text = buildShotShareText(makeShot({ brewTempC: 93 }));
      expect(text).toContain("199.4°F");
    });

    it("formats temperature in Celsius when specified", () => {
      const text = buildShotShareText(makeShot({ brewTempC: 93 }), "C");
      expect(text).toContain("93°C");
    });
  });

  // -----------------------------------------------------------------------
  // Blank line collapsing
  // -----------------------------------------------------------------------

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
      expect(text).not.toMatch(/\n{3,}/);
    });

    it("produces a trimmed result with no leading/trailing whitespace", () => {
      const text = buildShotShareText(makeShot());
      expect(text).toBe(text.trim());
    });
  });
});
