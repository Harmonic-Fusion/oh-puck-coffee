import { useSyncExternalStore, useCallback, useMemo, useState } from "react";
import type { ReorderableStepConfig } from "../step-config";

interface UseReorderableStepsOptions<TId extends string> {
  defaultSteps: ReorderableStepConfig<TId>[];
  orderKey: string;
  visibilityKey: string;
  showAllInputs?: boolean;
}

function getDefaultVisibility<TId extends string>(
  steps: ReorderableStepConfig<TId>[],
): Record<TId, boolean> {
  return steps.reduce(
    (acc, step) => ({ ...acc, [step.id]: step.visible }),
    {} as Record<TId, boolean>,
  );
}

// ── Shared subscription for same-tab localStorage updates ────────────────────
const localStorageListeners = new Set<() => void>();

function emitLocalStorageChange() {
  for (const listener of localStorageListeners) listener();
}

function subscribeLocalStorage(callback: () => void): () => void {
  localStorageListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    localStorageListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

// ── Snapshot helpers for useSyncExternalStore ─────────────────────────────────
function makeGetSnapshot(key: string): () => string | null {
  return () => localStorage.getItem(key);
}

const SERVER_SNAPSHOT = () => null;

export function useReorderableSteps<TId extends string>({
  defaultSteps,
  orderKey,
  visibilityKey,
  showAllInputs = false,
}: UseReorderableStepsOptions<TId>) {
  const getOrderSnapshot = useMemo(() => makeGetSnapshot(orderKey), [orderKey]);
  const getVisibilitySnapshot = useMemo(
    () => makeGetSnapshot(visibilityKey),
    [visibilityKey],
  );

  const orderRaw = useSyncExternalStore(
    subscribeLocalStorage,
    getOrderSnapshot,
    SERVER_SNAPSHOT,
  );

  const visibilityRaw = useSyncExternalStore(
    subscribeLocalStorage,
    getVisibilitySnapshot,
    SERVER_SNAPSHOT,
  );

  const order = useMemo(() => {
    if (!orderRaw) return defaultSteps.map((s) => s.id);
    try {
      const parsed = JSON.parse(orderRaw) as TId[];
      const defaultIds = defaultSteps.map((s) => s.id);
      return defaultIds.every((id) => parsed.includes(id))
        ? parsed
        : defaultSteps.map((s) => s.id);
    } catch {
      return defaultSteps.map((s) => s.id);
    }
  }, [orderRaw, defaultSteps]);

  const visibility = useMemo(() => {
    const defaults = getDefaultVisibility(defaultSteps);
    if (!visibilityRaw) return defaults;
    try {
      const parsed = JSON.parse(visibilityRaw) as Record<string, boolean>;
      return defaultSteps.reduce(
        (acc, step) => ({ ...acc, [step.id]: parsed[step.id] ?? step.visible }),
        {} as Record<TId, boolean>,
      );
    } catch {
      return defaults;
    }
  }, [visibilityRaw, defaultSteps]);

  const hasVisibleSteps = useMemo(
    () =>
      Object.values(visibility).some(Boolean) ||
      defaultSteps.some((s) => s.required === true && s.visible),
    [visibility, defaultSteps],
  );

  // Manual override: null = follow hasVisibleSteps; boolean = user-set value
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(
    null,
  );
  const isExpanded = expandedOverride ?? hasVisibleSteps;
  const setIsExpanded = useCallback(
    (val: boolean) => setExpandedOverride(val),
    [],
  );

  const [showOrderModal, setShowOrderModal] = useState(false);

  const handleOrderChange = useCallback(
    (newOrder: TId[], newVisibility: Record<TId, boolean>) => {
      localStorage.setItem(orderKey, JSON.stringify(newOrder));
      localStorage.setItem(visibilityKey, JSON.stringify(newVisibility));
      emitLocalStorageChange();
    },
    [orderKey, visibilityKey],
  );

  const orderedSteps = useMemo(() => {
    const currentOrder = showAllInputs
      ? defaultSteps.map((s) => s.id)
      : order;
    return currentOrder
      .map((id) => defaultSteps.find((s) => s.id === id))
      .filter(
        (step): step is ReorderableStepConfig<TId> => step !== undefined,
      );
  }, [order, showAllInputs, defaultSteps]);

  const isStepVisible = useCallback(
    (stepId: TId): boolean => {
      return showAllInputs || visibility[stepId];
    },
    [showAllInputs, visibility],
  );

  const defaultVisibility = useMemo(
    () => getDefaultVisibility(defaultSteps),
    [defaultSteps],
  );

  const handleReset = useCallback(() => {
    const defaultOrder = defaultSteps.map((s) => s.id);
    const defVis = getDefaultVisibility(defaultSteps);
    handleOrderChange(defaultOrder, defVis);
  }, [defaultSteps, handleOrderChange]);

  return {
    order,
    visibility,
    orderedSteps,
    isExpanded,
    setIsExpanded,
    showOrderModal,
    setShowOrderModal,
    handleOrderChange,
    handleReset,
    isStepVisible,
    defaultVisibility,
  };
}
