import { useState, useCallback, useEffect, useMemo } from "react";
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

function getSavedOrder<TId extends string>(
  key: string,
  defaultSteps: ReorderableStepConfig<TId>[],
): TId[] {
  if (typeof window === "undefined") return defaultSteps.map((s) => s.id);
  const saved = localStorage.getItem(key);
  if (!saved) return defaultSteps.map((s) => s.id);
  try {
    const parsed = JSON.parse(saved) as TId[];
    const defaultIds = defaultSteps.map((s) => s.id);
    const valid = defaultIds.every((id) => parsed.includes(id));
    return valid ? parsed : defaultSteps.map((s) => s.id);
  } catch {
    return defaultSteps.map((s) => s.id);
  }
}

function getSavedVisibility<TId extends string>(
  key: string,
  defaultSteps: ReorderableStepConfig<TId>[],
): Record<TId, boolean> {
  const defaults = getDefaultVisibility(defaultSteps);
  if (typeof window === "undefined") return defaults;
  const saved = localStorage.getItem(key);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    return defaultSteps.reduce(
      (acc, step) => ({ ...acc, [step.id]: parsed[step.id] ?? step.visible }),
      {} as Record<TId, boolean>,
    );
  } catch {
    return defaults;
  }
}

export function useReorderableSteps<TId extends string>({
  defaultSteps,
  orderKey,
  visibilityKey,
  showAllInputs = false,
}: UseReorderableStepsOptions<TId>) {
  const [order, setOrder] = useState<TId[]>(defaultSteps.map((s) => s.id));
  const [visibility, setVisibility] = useState<Record<TId, boolean>>(
    getDefaultVisibility(defaultSteps),
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Hydrate from localStorage on mount; auto-expand if any steps are visible
  useEffect(() => {
    setOrder(getSavedOrder(orderKey, defaultSteps));
    const vis = getSavedVisibility(visibilityKey, defaultSteps);
    setVisibility(vis);
    if (Object.values(vis).some(Boolean)) {
      setIsExpanded(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOrderChange = useCallback(
    (newOrder: TId[], newVisibility: Record<TId, boolean>) => {
      setOrder(newOrder);
      setVisibility(newVisibility);
      if (typeof window !== "undefined") {
        localStorage.setItem(orderKey, JSON.stringify(newOrder));
        localStorage.setItem(visibilityKey, JSON.stringify(newVisibility));
      }
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
