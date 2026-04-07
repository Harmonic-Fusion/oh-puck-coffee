import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiShotSuggestion } from "../AiShotSuggestion";
import { TestWrapper } from "@/test/setup";

const usage = {
  usedThisWeek: 1,
  weeklyLimit: 3,
  weekStartsAt: "2026-04-06T00:00:00.000Z",
};

const historyEmpty = { items: [] as { chatId: string; suggestion: string; createdAt: string }[] };

function installFetchMock(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  global.fetch = vi.fn(implementation) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AiShotSuggestion", () => {
  it("renders usage count and fetches suggestion after confirm", async () => {
    const user = userEvent.setup();
    const createBody = {
      suggestion: "Grind slightly finer.",
      chatId: "chat_x",
      usedThisWeek: 2,
      weeklyLimit: 3,
    };

    installFetchMock((input, init) => {
      const href = typeof input === "string" ? input : (input as Request).url;
      const method = init?.method ?? (typeof input === "object" && input instanceof Request ? input.method : "GET");

      if (href.includes("/chats/usage")) {
        return Promise.resolve(Response.json(usage));
      }
      if (href.includes("/chats") && href.includes("beanId=") && method === "GET") {
        return Promise.resolve(Response.json(historyEmpty));
      }
      if (href.includes("/chats") && method === "POST") {
        return Promise.resolve(Response.json(createBody));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${href} ${method}`));
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    render(
      <TestWrapper>
        <AiShotSuggestion beanId="b_test" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/1 of 3 suggestions used this week/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^get suggestion$/i }));

    await screen.findByRole("heading", { name: /use one ai suggestion/i });

    await user.click(screen.getByRole("button", { name: /yes, use one/i }));

    await waitFor(() => {
      expect(screen.getByText("Grind slightly finer.")).toBeInTheDocument();
    });

    const postCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/api/chats") &&
        !url.includes("usage") &&
        !url.includes("beanId=") &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCalls.length).toBe(1);
  });

  it("disables the button at weekly limit", async () => {
    const atLimitUsage = {
      ...usage,
      usedThisWeek: 3,
      weeklyLimit: 3,
    };

    installFetchMock((input, init) => {
      const href = typeof input === "string" ? input : (input as Request).url;
      const method = init?.method ?? (typeof input === "object" && input instanceof Request ? input.method : "GET");

      if (href.includes("/chats/usage")) {
        return Promise.resolve(Response.json(atLimitUsage));
      }
      if (href.includes("/chats") && href.includes("beanId=") && method === "GET") {
        return Promise.resolve(Response.json(historyEmpty));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${href} ${method}`));
    });

    render(
      <TestWrapper>
        <AiShotSuggestion beanId="b_test" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/3 of 3 suggestions used this week/)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /weekly limit reached/i }),
    ).toBeDisabled();
  });

  it("shows an error when the API fails", async () => {
    const user = userEvent.setup();
    let postCount = 0;

    installFetchMock((input, init) => {
      const href = typeof input === "string" ? input : (input as Request).url;
      const method = init?.method ?? (typeof input === "object" && input instanceof Request ? input.method : "GET");

      if (href.includes("/chats/usage")) {
        return Promise.resolve(Response.json(usage));
      }
      if (href.includes("/chats") && href.includes("beanId=") && method === "GET") {
        return Promise.resolve(Response.json(historyEmpty));
      }
      if (href.includes("/chats") && method === "POST") {
        postCount += 1;
        return Promise.resolve(
          Response.json(
            {
              error: "Weekly AI suggestion limit reached",
              code: "ai_suggestion_limit",
            },
            { status: 429 },
          ),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch: ${href} ${method}`));
    });

    render(
      <TestWrapper>
        <AiShotSuggestion beanId="b_test" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^get suggestion$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^get suggestion$/i }));
    await user.click(screen.getByRole("button", { name: /yes, use one/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent(/Weekly AI suggestion limit reached/);
    });
    expect(postCount).toBe(1);
  });
});
