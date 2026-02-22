import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";

// ---------------------------------------------------------------------------
// Hoisted mock state – accessible inside vi.mock factories
// ---------------------------------------------------------------------------
const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  lastShot: null as ShotWithJoins | null,
  shotById: {} as Record<string, ShotWithJoins | undefined>,
  errorShotIds: new Set<string>(),
  push: vi.fn(),
  replace: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockState.push,
    replace: mockState.replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockState.searchParams,
}));

// ---------------------------------------------------------------------------
// Mock shot hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/shots/hooks", () => ({
  useLastShot: () => ({ data: mockState.lastShot }),
  useShot: (id: string | null) => ({
    data: id ? mockState.shotById[id] : undefined,
    isLoading: id ? !mockState.shotById[id] && !mockState.errorShotIds.has(id) : false,
    isError: id ? mockState.errorShotIds.has(id) : false,
  }),
  useCreateShot: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteShot: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useToggleReference: () => ({ mutate: vi.fn() }),
  useToggleHidden: () => ({ mutate: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock other hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/beans/hooks", () => ({
  useBeans: () => ({ data: [] }),
}));

vi.mock("@/components/equipment/hooks", () => ({
  useGrinders: () => ({ data: [] }),
  useMachines: () => ({ data: [] }),
}));

vi.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock child components – SectionRecipe exposes previousShotId + form values
// ---------------------------------------------------------------------------
vi.mock("../SectionBasics", () => ({
  SectionBasics: () => <div data-testid="section-basics" />,
}));

vi.mock("../SectionRecipe", async () => {
  const { useFormContext } = await import("react-hook-form");
  return {
    SectionRecipe: function MockSectionRecipe({
      previousShotId,
    }: {
      previousShotId?: string | null;
      onViewShot?: unknown;
    }) {
      const { watch } = useFormContext();
      return (
        <div
          data-testid="section-recipe"
          data-previous-shot-id={previousShotId ?? ""}
          data-bean-id={watch("beanId") ?? ""}
          data-dose-grams={watch("doseGrams") ?? ""}
          data-grinder-id={watch("grinderId") ?? ""}
        />
      );
    },
  };
});

vi.mock("../SectionResults", () => ({
  SectionResults: () => <div data-testid="section-results" />,
}));

vi.mock("../ShotSuccessModal", () => ({
  ShotSuccessModal: () => null,
}));

vi.mock("@/components/shots/log/ShotDetail", () => ({
  ShotDetail: () => null,
}));

vi.mock("@/components/common/ValidationBanner", () => ({
  ValidationBanner: () => null,
}));

vi.mock("@/components/common/Button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

// ---------------------------------------------------------------------------
// Import ShotForm AFTER all mocks are declared
// ---------------------------------------------------------------------------
import { ShotForm } from "../ShotForm";

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------
function makeMockShot(overrides: Partial<ShotWithJoins> = {}): ShotWithJoins {
  return {
    id: "shot-default",
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
    flavors: [],
    bodyTexture: [],
    adjectives: [],
    toolsUsed: [],
    notes: null,
    isReferenceShot: false,
    isHidden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    beanName: "Test Bean",
    beanRoastLevel: "Medium",
    beanRoastDate: null,
    userName: "Test User",
    grinderName: "Test Grinder",
    machineName: "Test Machine",
    daysPostRoast: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Render helper – keeps QueryClient isolated per call
// ---------------------------------------------------------------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return Wrapper;
}

// ---------------------------------------------------------------------------
// Helpers to read the mocked SectionRecipe's data attributes
// ---------------------------------------------------------------------------
function getRecipeAttr(attr: string): string {
  return screen.getByTestId("section-recipe").getAttribute(attr) ?? "";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ShotForm pre-population priority", () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastShot = null;
    mockState.shotById = {};
    mockState.errorShotIds = new Set();
    mockState.push.mockReset();
    mockState.replace.mockReset();
    sessionStorage.clear();
  });

  // -----------------------------------------------------------------------
  // Priority resolution for previousShotId
  // -----------------------------------------------------------------------

  it("passes no previousShotId when no URL params and no lastShot", async () => {
    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("");
    });
  });

  it("uses lastShot.id as previousShotId when no URL params", async () => {
    mockState.lastShot = makeMockShot({ id: "last-shot-123" });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("last-shot-123");
    });
  });

  it("uses previousShotId from URL when shot data is loaded", async () => {
    mockState.searchParams = new URLSearchParams(
      "previousShotId=url-shot-abc"
    );
    mockState.lastShot = makeMockShot({ id: "last-shot-123" });
    mockState.shotById["url-shot-abc"] = makeMockShot({ id: "url-shot-abc" });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("url-shot-abc");
    });
  });

  it("uses shotId URL param as fallback for previousShotId", async () => {
    mockState.searchParams = new URLSearchParams("shotId=fallback-shot");
    mockState.shotById["fallback-shot"] = makeMockShot({ id: "fallback-shot" });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("fallback-shot");
    });
  });

  // -----------------------------------------------------------------------
  // Explicit empty previousShotId= means "start fresh"
  // -----------------------------------------------------------------------

  it("skips all pre-population when previousShotId= is empty in URL", async () => {
    mockState.searchParams = new URLSearchParams("previousShotId=");
    mockState.lastShot = makeMockShot({
      id: "last-shot",
      beanId: "last-bean",
      doseGrams: "22",
    });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      // No previous shot shown
      expect(getRecipeAttr("data-previous-shot-id")).toBe("");
      // Form stays blank — lastShot is NOT used
      expect(getRecipeAttr("data-bean-id")).toBe("");
      expect(getRecipeAttr("data-dose-grams")).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // Race condition fix: URL shot loading should block fallback to lastShot
  // -----------------------------------------------------------------------

  it("does NOT fall through to lastShot while URL-specified shot is loading", async () => {
    mockState.searchParams = new URLSearchParams(
      "previousShotId=loading-shot-id"
    );
    mockState.lastShot = makeMockShot({ id: "last-shot-123" });
    // shotById intentionally does NOT contain "loading-shot-id" → simulates loading

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      // previousShotId should remain the URL value (set by sync effect),
      // NOT lastShot.id (which would indicate the race condition bug)
      expect(getRecipeAttr("data-previous-shot-id")).toBe("loading-shot-id");
    });
  });

  it("resolves to URL shot once it finishes loading (after initial wait)", async () => {
    mockState.searchParams = new URLSearchParams(
      "previousShotId=slow-shot-id"
    );
    mockState.lastShot = makeMockShot({ id: "last-shot-123" });
    // Initially: shot is loading (not in shotById)

    const { rerender } = render(<ShotForm />, { wrapper: createWrapper() });

    // While loading: previousShotId should be from URL, not lastShot
    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("slow-shot-id");
    });

    // Simulate shot data arriving
    mockState.shotById["slow-shot-id"] = makeMockShot({
      id: "slow-shot-id",
      beanId: "slow-bean",
      doseGrams: "20",
    });
    rerender(<ShotForm />);

    // After loading: previousShotId stays the same, form values should be from the shot
    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("slow-shot-id");
      expect(getRecipeAttr("data-bean-id")).toBe("slow-bean");
      expect(getRecipeAttr("data-dose-grams")).toBe("20");
    });
  });

  it("falls back to empty form when URL shot is not found in the database", async () => {
    mockState.searchParams = new URLSearchParams(
      "previousShotId=nonexistent-shot"
    );
    // Simulate the query erroring out (404 from the API)
    mockState.errorShotIds.add("nonexistent-shot");
    // lastShot exists but should NOT be used
    mockState.lastShot = makeMockShot({ id: "last-shot-999", beanId: "last-bean" });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      // previousShotId should be cleared (null → empty string in the attribute)
      expect(getRecipeAttr("data-previous-shot-id")).toBe("");
      // Form should be empty — no pre-population from lastShot
      expect(getRecipeAttr("data-bean-id")).toBe("");
      expect(getRecipeAttr("data-dose-grams")).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // Form pre-population values
  // -----------------------------------------------------------------------

  it("pre-populates form values from URL-specified shot", async () => {
    const urlShot = makeMockShot({
      id: "url-shot",
      beanId: "url-bean",
      grinderId: "url-grinder",
      doseGrams: "20",
    });
    mockState.searchParams = new URLSearchParams("previousShotId=url-shot");
    mockState.shotById["url-shot"] = urlShot;

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-bean-id")).toBe("url-bean");
      expect(getRecipeAttr("data-grinder-id")).toBe("url-grinder");
      expect(getRecipeAttr("data-dose-grams")).toBe("20");
    });
  });

  it("pre-populates form values from lastShot when no URL params", async () => {
    mockState.lastShot = makeMockShot({
      id: "last-shot",
      beanId: "last-bean",
      grinderId: "last-grinder",
      doseGrams: "22",
    });

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-bean-id")).toBe("last-bean");
      expect(getRecipeAttr("data-grinder-id")).toBe("last-grinder");
      expect(getRecipeAttr("data-dose-grams")).toBe("22");
    });
  });

  it("leaves form blank when no URL params and no lastShot", async () => {
    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-bean-id")).toBe("");
      expect(getRecipeAttr("data-dose-grams")).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // Priority 3: sessionStorage duplicate shot
  // -----------------------------------------------------------------------

  it("uses duplicate shot from sessionStorage over lastShot", async () => {
    mockState.lastShot = makeMockShot({ id: "last-shot" });
    sessionStorage.setItem(
      "duplicateShot",
      JSON.stringify({
        shotId: "dup-shot-id",
        beanId: "dup-bean",
        doseGrams: 19,
      })
    );

    render(<ShotForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("dup-shot-id");
      expect(getRecipeAttr("data-bean-id")).toBe("dup-bean");
      expect(getRecipeAttr("data-dose-grams")).toBe("19");
    });
  });

  // -----------------------------------------------------------------------
  // Log Another: searchParams change resets pre-population
  // -----------------------------------------------------------------------

  it("re-populates when searchParams change (Log Another flow)", async () => {
    // Step 1: initial load with lastShot
    mockState.lastShot = makeMockShot({
      id: "original-last",
      beanId: "original-bean",
    });

    const wrapper = createWrapper();
    const { rerender } = render(<ShotForm />, { wrapper });

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("original-last");
      expect(getRecipeAttr("data-bean-id")).toBe("original-bean");
    });

    // Step 2: simulate "Log Another" navigation with new previousShotId
    const newShot = makeMockShot({
      id: "new-shot-id",
      beanId: "new-bean",
      doseGrams: "21",
    });
    mockState.searchParams = new URLSearchParams(
      "previousShotId=new-shot-id"
    );
    mockState.shotById["new-shot-id"] = newShot;

    rerender(<ShotForm />);

    await waitFor(() => {
      expect(getRecipeAttr("data-previous-shot-id")).toBe("new-shot-id");
      expect(getRecipeAttr("data-bean-id")).toBe("new-bean");
      expect(getRecipeAttr("data-dose-grams")).toBe("21");
    });
  });
});
