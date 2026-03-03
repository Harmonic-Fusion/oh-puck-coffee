import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { SectionBrewing } from "../__components__/SectionBrewing";
import { SectionTasting } from "../__components__/SectionTasting";
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

describe("SectionBrewing", () => {
  it("renders section title", () => {
    render(
      <TestWrapper>
        <SectionBrewing />
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
        <SectionBrewing />
      </TestWrapper>
    );
    expect(screen.getByText("Shot Quality")).toBeInTheDocument();
  });
});

describe("SectionTasting", () => {
  it("renders section title", () => {
    render(
      <TestWrapper>
        <SectionTasting />
      </TestWrapper>
    );
    expect(screen.getByText("Tasting Notes")).toBeInTheDocument();
  });

  it("renders Notes textarea", () => {
    render(
      <TestWrapper>
        <SectionTasting />
      </TestWrapper>
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("allows entering multi-line notes", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SectionTasting />
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

      React.useEffect(() => {
        methods.setError("notes", { message: "Notes are required" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <TestWrapperWithError>
        <SectionTasting />
      </TestWrapperWithError>
    );

    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });

  it("has correct placeholder for Notes", () => {
    render(
      <TestWrapper>
        <SectionTasting />
      </TestWrapper>
    );
    expect(
      screen.getByPlaceholderText("Any additional observations...")
    ).toBeInTheDocument();
  });

  it("Notes textarea has rows attribute set to 4", () => {
    render(
      <TestWrapper>
        <SectionTasting />
      </TestWrapper>
    );
    const notesTextarea = screen.getByLabelText("Notes");
    expect(notesTextarea).toHaveAttribute("rows", "4");
  });
});
