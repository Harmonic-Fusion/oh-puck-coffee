import { describe, it, expect } from "vitest";
import { no_pucking_swearing } from "../no-pucking";

describe("no_pucking_swearing", () => {
  it("replaces basic swear words", () => {
    expect(no_pucking_swearing("fuck")).toBe("puck");
    expect(no_pucking_swearing("shit")).toBe("shot");
    expect(no_pucking_swearing("bitch")).toBe("breve");
  });

  it("handles leading spaces as requested", () => {
    expect(no_pucking_swearing(" fuck")).toBe(" puck");
    expect(no_pucking_swearing(" shit")).toBe(" shot");
    expect(no_pucking_swearing(" bitch")).toBe(" breve");
  });

  it("handles capitalization", () => {
    expect(no_pucking_swearing("Fuck")).toBe("Puck");
    expect(no_pucking_swearing("SHIT")).toBe("SHOT");
    expect(no_pucking_swearing("Bitch")).toBe("Breve");
  });

  it("handles sentences", () => {
    expect(no_pucking_swearing("This is some fucking bullshit.")).toBe(
      "This is some pucking bullshot."
    );
    expect(
      no_pucking_swearing("What the hell is this piece of shit?")
    ).toBe("What the hull is this piece of shot?");
  });

  it("ignores words that contain swear words but are not swear words", () => {
    expect(no_pucking_swearing("assistant")).toBe("assistant");
    expect(no_pucking_swearing("classic")).toBe("classic");
  });

  it("handles other common swear words", () => {
    expect(no_pucking_swearing("damn it")).toBe("decaf it");
    expect(no_pucking_swearing("you bastard")).toBe("you barista");
    expect(no_pucking_swearing("stop being a dick")).toBe("stop being a drip");
  });

  it("handles empty or null-ish input", () => {
    expect(no_pucking_swearing("")).toBe("");
  });

  it("handles overlapping or nested words correctly (longest first)", () => {
    // motherfucker should become motherpucker, not motherpuck
    expect(no_pucking_swearing("motherfucker")).toBe("motherpucker");
    expect(no_pucking_swearing("motherfucking")).toBe("motherpucking");
  });

  it("preserves capitalization patterns in the new implementation", () => {
    expect(no_pucking_swearing("SHIT")).toBe("SHOT");
    expect(no_pucking_swearing("Shit")).toBe("Shot");
    expect(no_pucking_swearing("shit")).toBe("shot");
  });
});
