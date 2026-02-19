import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShotDetail } from "./ShotDetail";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { TestWrapper } from "@/test/setup";

// Mock QRCode component to avoid canvas issues in tests
vi.mock("@/components/common/QRCode", () => ({
  QRCode: ({ value, title }: { value: string; title?: string }) => (
    <div data-testid="qrcode" data-value={value} data-title={title}>
      QR Code: {value}
    </div>
  ),
}));

const mockShot: ShotWithJoins = {
  id: "1",
  userId: "user1",
  beanId: "bean1",
  grinderId: "grinder1",
  machineId: "machine1",
  doseGrams: "18",
  yieldGrams: "36",
  grindLevel: "5",
  brewTimeSecs: "30",
  brewTempC: "93",
  preInfusionDuration: "5",
  brewPressure: "9",
  estimateMaxPressure: null,
  flowControl: null,
  yieldActualGrams: null,
  brewRatio: null,
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
  beanRoastDate: null,
  userName: "Test User",
  grinderName: "Test Grinder",
  machineName: "Test Machine",
  daysPostRoast: 5,
};

describe("ShotDetail", () => {
  it("renders shot notes when present", () => {
    render(
      <TestWrapper>
        <ShotDetail
          shot={mockShot}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Great shot with balanced flavor")).toBeInTheDocument();
  });

  it("does not render notes section when notes are empty", () => {
    const shotWithoutNotes = { ...mockShot, notes: null };
    render(
      <TestWrapper>
        <ShotDetail
          shot={shotWithoutNotes}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("preserves line breaks in multi-line notes", () => {
    const multiLineNotes = "First line\nSecond line\nThird line";
    const shotWithMultiLineNotes = { ...mockShot, notes: multiLineNotes };

    render(
      <TestWrapper>
        <ShotDetail
          shot={shotWithMultiLineNotes}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    // Find the notes element by its class and verify it has the whitespace-pre-wrap class
    // The actual text content will have newlines preserved in the DOM due to whitespace-pre-wrap
    const notesElement = screen.getByText("Notes").nextElementSibling;
    expect(notesElement).toBeInTheDocument();
    expect(notesElement).toHaveTextContent("First line Second line Third line"); // normalized
    expect(notesElement).toHaveClass("whitespace-pre-wrap");
  });

  it("renders notes with whitespace-pre-wrap class for line break preservation", () => {
    const multiLineNotes = "Line 1\nLine 2";
    const shotWithMultiLineNotes = { ...mockShot, notes: multiLineNotes };

    render(
      <TestWrapper>
        <ShotDetail
          shot={shotWithMultiLineNotes}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    // Find the notes element by its class and verify it has the whitespace-pre-wrap class
    // The actual text content will have newlines preserved in the DOM due to whitespace-pre-wrap
    const notesElement = screen.getByText("Notes").nextElementSibling;
    expect(notesElement).toBeInTheDocument();
    expect(notesElement).toHaveTextContent("Line 1 Line 2"); // normalized
    expect(notesElement).toHaveClass("whitespace-pre-wrap");
  });

  it("displays empty string notes as empty", () => {
    const shotWithEmptyNotes = { ...mockShot, notes: "" };
    render(
      <TestWrapper>
        <ShotDetail
          shot={shotWithEmptyNotes}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("handles notes with special characters", () => {
    const specialNotes = "Notes with: special chars! @#$%^&*()";
    const shotWithSpecialNotes = { ...mockShot, notes: specialNotes };

    render(
      <TestWrapper>
        <ShotDetail
          shot={shotWithSpecialNotes}
          open={true}
          onClose={() => {}}
        />
      </TestWrapper>
    );

    expect(screen.getByText(specialNotes)).toBeInTheDocument();
  });
});
