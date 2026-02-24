import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { SectionResults } from "./SectionResults";
import type { CreateShot } from "@/shared/shots/schema";
import React from "react";

function TestWrapper({ children }: { children: React.ReactNode }) {
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

describe("SectionResults", () => {
  it("renders section titles", () => {
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Tasting Notes")).toBeInTheDocument();
  });

  it("renders Notes textarea", () => {
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("allows entering multi-line notes", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );

    const notesTextarea = screen.getByLabelText("Notes");
    const multiLineText = "First observation\nSecond observation\nThird observation";

    await user.type(notesTextarea, multiLineText);

    expect(notesTextarea).toHaveValue(multiLineText);
  });

  it("displays error message for notes field", () => {
    function TestWrapperWithError({ children }: { children: React.ReactNode }) {
      const methods = useForm<CreateShot>({
        defaultValues: {
          beanId: "",
          grinderId: "",
          notes: "",
          shotQuality: 1,
        },
      });

      // Set an error manually for testing using useEffect to avoid infinite re-renders
      React.useEffect(() => {
        methods.setError("notes", { message: "Notes are required" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <TestWrapperWithError>
        <SectionResults />
      </TestWrapperWithError>
    );

    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });

  it("renders Shot Quality slider when visible", () => {
    // "shotQuality" is hidden by default; set localStorage to make it visible
    const resultsVisibility = {
      yieldActual: true,
      brewTime: true,
      estimateMaxPressure: false,
      shotQuality: true,
    };
    localStorage.setItem("coffee-results-visibility", JSON.stringify(resultsVisibility));

    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    expect(screen.getByText("Shot Quality")).toBeInTheDocument();
  });

  it("has correct placeholder for Notes", () => {
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    expect(
      screen.getByPlaceholderText("Any additional observations...")
    ).toBeInTheDocument();
  });

  it("Notes textarea has rows attribute set to 4", () => {
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    const notesTextarea = screen.getByLabelText("Notes");
    expect(notesTextarea).toHaveAttribute("rows", "4");
  });
});
