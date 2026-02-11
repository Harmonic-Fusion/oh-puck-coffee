import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders with label", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("renders without label", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
  });

  it("displays placeholder text", () => {
    render(<Textarea placeholder="Enter notes..." />);
    expect(screen.getByPlaceholderText("Enter notes...")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<Textarea label="Notes" error="This field is required" />);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("displays hint text when no error", () => {
    render(<Textarea label="Notes" hint="Enter your notes here" />);
    expect(screen.getByText("Enter your notes here")).toBeInTheDocument();
  });

  it("does not display hint when error is present", () => {
    render(
      <Textarea
        label="Notes"
        hint="Enter your notes here"
        error="This field is required"
      />
    );
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.queryByText("Enter your notes here")).not.toBeInTheDocument();
  });

  it("allows user to type multi-line text", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Notes" />);
    const textarea = screen.getByLabelText("Notes");

    const multiLineText = "Line 1\nLine 2\nLine 3";
    await user.type(textarea, multiLineText);

    expect(textarea).toHaveValue(multiLineText);
  });

  it("respects rows prop", () => {
    render(<Textarea label="Notes" rows={6} />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toHaveAttribute("rows", "6");
  });

  it("uses default rows of 4", () => {
    render(<Textarea label="Notes" />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toHaveAttribute("rows", "4");
  });

  it("forwards ref correctly", () => {
    const ref = { current: null };
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("applies custom className", () => {
    render(<Textarea className="custom-class" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("custom-class");
  });

  it("is disabled when disabled prop is true", () => {
    render(<Textarea label="Notes" disabled />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toBeDisabled();
  });
});
