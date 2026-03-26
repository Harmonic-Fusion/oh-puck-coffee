import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, type ReactNode } from "react";
import { SectionBrewing, DEFAULT_RESULTS_STEPS } from "../__components__/SectionBrewing";
import { SectionTasting, DEFAULT_TASTING_STEPS } from "../__components__/SectionTasting";
import type { CreateShot } from "@/shared/shots/schema";
import { useReorderableSteps } from "../hooks/useReorderableSteps";

function TestWrapper({ children }: { children: ReactNode }) {
  const methods = useForm<CreateShot>({
    defaultValues: {
      beanId: "",
      grinderId: "",
      notes: "",
      shotQuality: 1,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

function BrewingWrapper() {
  const steps = useReorderableSteps({
    defaultSteps: DEFAULT_RESULTS_STEPS,
    orderKey: "coffee-results-order",
    visibilityKey: "coffee-results-visibility",
  });
  return (
    <SectionBrewing
      steps={steps}
      pendingPhotos={[]}
      onPendingPhotosChange={() => {}}
    />
  );
}

function TastingWrapper() {
  const steps = useReorderableSteps({
    defaultSteps: DEFAULT_TASTING_STEPS,
    orderKey: "coffee-tasting-order",
    visibilityKey: "coffee-tasting-visibility",
  });
  return <SectionTasting steps={steps} />;
}

describe("SectionBrewing", () => {
  it("renders section title", () => {
    render(
      <TestWrapper>
        <BrewingWrapper />
      </TestWrapper>
    );
    expect(screen.getByText("Brewing")).toBeInTheDocument();
  });

  it("renders Shot Quality slider when visible", () => {
    const resultsVisibility = {
      yieldActual: true,
      brewTime: true,
      estimateMaxPressure: false,
      shotQuality: true,
    };
    localStorage.setItem("coffee-results-visibility", JSON.stringify(resultsVisibility));

    render(
      <TestWrapper>
        <BrewingWrapper />
      </TestWrapper>
    );
    expect(screen.getByText("Shot Quality")).toBeInTheDocument();
  });
});

describe("SectionTasting", () => {
  it("renders section title", () => {
    render(
      <TestWrapper>
        <TastingWrapper />
      </TestWrapper>
    );
    expect(screen.getByText("Tasting Notes")).toBeInTheDocument();
  });

  it("renders Notes textarea", () => {
    render(
      <TestWrapper>
        <TastingWrapper />
      </TestWrapper>
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("allows entering multi-line notes", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <TastingWrapper />
      </TestWrapper>
    );

    const notesTextarea = screen.getByLabelText("Notes");
    const multiLineText = "First observation\nSecond observation\nThird observation";

    await user.type(notesTextarea, multiLineText);

    expect(notesTextarea).toHaveValue(multiLineText);
  });

  it("displays error message for notes field", () => {
    function TestWrapperWithError({ children }: { children: ReactNode }) {
      const methods = useForm<CreateShot>({
        defaultValues: {
          beanId: "",
          grinderId: "",
          notes: "",
          shotQuality: 1,
        },
      });

      useEffect(() => {
        methods.setError("notes", { message: "Notes are required" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <TestWrapperWithError>
        <TastingWrapper />
      </TestWrapperWithError>
    );

    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });

  it("has correct placeholder for Notes", () => {
    render(
      <TestWrapper>
        <TastingWrapper />
      </TestWrapper>
    );
    expect(
      screen.getByPlaceholderText("Any additional observations...")
    ).toBeInTheDocument();
  });

  it("Notes textarea has rows attribute set to 4", () => {
    render(
      <TestWrapper>
        <TastingWrapper />
      </TestWrapper>
    );
    const notesTextarea = screen.getByLabelText("Notes");
    expect(notesTextarea).toHaveAttribute("rows", "4");
  });
});
