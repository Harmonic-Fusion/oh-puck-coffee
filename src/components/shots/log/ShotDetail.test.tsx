import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShotDetail } from "./ShotDetail";
import type { ShotWithJoins } from "@/components/shots/hooks";

const mockShot: ShotWithJoins = {
  id: "1",
  userId: "user1",
  beanId: "bean1",
  grinderId: "grinder1",
  machineId: "machine1",
  doseGrams: "18",
  yieldGrams: "36",
  grindLevel: "5",
  brewTimeSecs: 30,
  brewTempC: 93,
  preInfusionDuration: 5,
  brewPressure: 9,
  flowRate: null,
  shotQuality: 4,
  rating: 5,
  flavorWheelBody: "Medium",
  flavorWheelCategories: {},
  flavorWheelAdjectives: [],
  toolsUsed: [],
  notes: "Great shot with balanced flavor",
  isReferenceShot: false,
  isHidden: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  beanName: "Test Bean",
  userName: "Test User",
  grinderName: "Test Grinder",
  machineName: "Test Machine",
  daysPostRoast: 5,
};

describe("ShotDetail", () => {
  it("renders shot notes when present", () => {
    render(
      <ShotDetail
        shot={mockShot}
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Great shot with balanced flavor")).toBeInTheDocument();
  });

  it("does not render notes section when notes are empty", () => {
    const shotWithoutNotes = { ...mockShot, notes: null };
    render(
      <ShotDetail
        shot={shotWithoutNotes}
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("preserves line breaks in multi-line notes", () => {
    const multiLineNotes = "First line\nSecond line\nThird line";
    const shotWithMultiLineNotes = { ...mockShot, notes: multiLineNotes };

    render(
      <ShotDetail
        shot={shotWithMultiLineNotes}
        open={true}
        onClose={() => {}}
      />
    );

    const notesElement = screen.getByText(multiLineNotes);
    expect(notesElement).toBeInTheDocument();
    expect(notesElement).toHaveClass("whitespace-pre-wrap");
  });

  it("renders notes with whitespace-pre-wrap class for line break preservation", () => {
    const multiLineNotes = "Line 1\nLine 2";
    const shotWithMultiLineNotes = { ...mockShot, notes: multiLineNotes };

    render(
      <ShotDetail
        shot={shotWithMultiLineNotes}
        open={true}
        onClose={() => {}}
      />
    );

    const notesElement = screen.getByText(multiLineNotes);
    expect(notesElement).toHaveClass("whitespace-pre-wrap");
  });

  it("displays empty string notes as empty", () => {
    const shotWithEmptyNotes = { ...mockShot, notes: "" };
    render(
      <ShotDetail
        shot={shotWithEmptyNotes}
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("handles notes with special characters", () => {
    const specialNotes = "Notes with: special chars! @#$%^&*()";
    const shotWithSpecialNotes = { ...mockShot, notes: specialNotes };

    render(
      <ShotDetail
        shot={shotWithSpecialNotes}
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(specialNotes)).toBeInTheDocument();
  });
});
