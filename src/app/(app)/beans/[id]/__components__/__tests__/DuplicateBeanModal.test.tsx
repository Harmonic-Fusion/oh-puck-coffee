import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DuplicateBeanModal } from "../DuplicateBeanModal";
import { TestWrapper } from "@/test/setup";

describe("DuplicateBeanModal", () => {
  it("renders title, bean name, shot options, and Duplicate button", () => {
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={vi.fn()}
          beanName="Colombian Supremo"
          shotOption="duplicate"
          onShotOptionChange={vi.fn()}
          onDuplicate={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("heading", { name: /duplicate bean/i })).toBeInTheDocument();
    expect(screen.getByText(/Colombian Supremo/)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("duplicate");
    expect(screen.getByRole("button", { name: /^duplicate$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("shows Copy my shots / Move my shots / No shots options", () => {
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={vi.fn()}
          beanName="Test"
          shotOption="duplicate"
          onShotOptionChange={vi.fn()}
          onDuplicate={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveDisplayValue(/copy my shots/i);
    expect(screen.getByRole("option", { name: /copy my shots/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /move my shots/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /no shots/i })).toBeInTheDocument();
  });

  it("calls onShotOptionChange when option is changed", async () => {
    const onShotOptionChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={vi.fn()}
          beanName="Test"
          shotOption="duplicate"
          onShotOptionChange={onShotOptionChange}
          onDuplicate={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    await user.selectOptions(screen.getByRole("combobox"), "migrate");
    expect(onShotOptionChange).toHaveBeenCalledWith("migrate");
  });

  it("calls onDuplicate when Duplicate is clicked", async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={vi.fn()}
          beanName="Test"
          shotOption="none"
          onShotOptionChange={vi.fn()}
          onDuplicate={onDuplicate}
          isPending={false}
        />
      </TestWrapper>,
    );
    await user.click(screen.getByRole("button", { name: /^duplicate$/i }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={onClose}
          beanName="Test"
          shotOption="duplicate"
          onShotOptionChange={vi.fn()}
          onDuplicate={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Duplicate button when isPending", () => {
    render(
      <TestWrapper>
        <DuplicateBeanModal
          open={true}
          onClose={vi.fn()}
          beanName="Test"
          shotOption="duplicate"
          onShotOptionChange={vi.fn()}
          onDuplicate={vi.fn()}
          isPending={true}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: /duplicating/i })).toBeDisabled();
  });
});
