import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnfollowConfirmDialog } from "../UnfollowConfirmDialog";
import { TestWrapper } from "@/test/setup";

describe("UnfollowConfirmDialog", () => {
  it("renders title and bean name", () => {
    render(
      <TestWrapper>
        <UnfollowConfirmDialog
          open={true}
          onClose={vi.fn()}
          beanName="Ethiopian Yirgacheffe"
          onConfirm={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("heading", { name: /unfollow bean\?/i })).toBeInTheDocument();
    expect(screen.getByText(/Ethiopian Yirgacheffe/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^unfollow$/i })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <UnfollowConfirmDialog
          open={true}
          onClose={onClose}
          beanName="Test Bean"
          onConfirm={vi.fn()}
          isPending={false}
        />
      </TestWrapper>,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Unfollow is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <UnfollowConfirmDialog
          open={true}
          onClose={vi.fn()}
          beanName="Test Bean"
          onConfirm={onConfirm}
          isPending={false}
        />
      </TestWrapper>,
    );
    await user.click(screen.getByRole("button", { name: /^unfollow$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables Unfollow button when isPending", () => {
    render(
      <TestWrapper>
        <UnfollowConfirmDialog
          open={true}
          onClose={vi.fn()}
          beanName="Test Bean"
          onConfirm={vi.fn()}
          isPending={true}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: /unfollowing/i })).toBeDisabled();
  });
});
