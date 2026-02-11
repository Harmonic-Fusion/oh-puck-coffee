import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { SectionResults } from "./SectionResults";
import type { CreateShot } from "@/shared/shots/schema";

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
  it("renders section title", () => {
    render(
      <TestWrapper>
        <SectionResults />
      </TestWrapper>
    );
    expect(screen.getByText("Results & Tasting")).toBeInTheDocument();
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

      // Set an error manually for testing
      methods.setError("notes", { message: "Notes are required" });

      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <TestWrapperWithError>
        <SectionResults />
      </TestWrapperWithError>
    );

    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });

  it("renders Shot Quality slider", () => {
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
