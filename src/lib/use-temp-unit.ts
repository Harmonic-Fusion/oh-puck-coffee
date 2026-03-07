"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { TempUnit } from "@/lib/format-numbers";
import { getSavedTempUnit, saveTempUnit } from "@/lib/format-numbers";

let tempUnitListeners: Array<() => void> = [];

function emitTempUnitChange() {
  for (const listener of tempUnitListeners) {
    listener();
  }
}

function subscribeTempUnit(callback: () => void) {
  tempUnitListeners.push(callback);
  return () => {
    tempUnitListeners = tempUnitListeners.filter((l) => l !== callback);
  };
}

export function useTempUnit(): [TempUnit, (unit: TempUnit) => void] {
  const unit = useSyncExternalStore(
    subscribeTempUnit,
    getSavedTempUnit,
    () => "F" as TempUnit,
  );

  const setUnit = useCallback((next: TempUnit) => {
    saveTempUnit(next);
    emitTempUnitChange();
  }, []);

  return [unit, setUnit];
}
