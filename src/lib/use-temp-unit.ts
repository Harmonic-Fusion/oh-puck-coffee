"use client";

import { useState, useEffect, useCallback } from "react";
import type { TempUnit } from "@/lib/format-numbers";
import { getSavedTempUnit, saveTempUnit } from "@/lib/format-numbers";

/**
 * React hook that manages the user's preferred temperature display unit.
 * Reads from / writes to localStorage so the preference persists.
 *
 * Returns [unit, setUnit] – the current unit and a setter that also persists.
 */
export function useTempUnit(): [TempUnit, (unit: TempUnit) => void] {
  // Default to "F" on the server; hydrate from localStorage in useEffect
  const [unit, setUnitState] = useState<TempUnit>("F");

  useEffect(() => {
    setUnitState(getSavedTempUnit());
  }, []);

  const setUnit = useCallback((next: TempUnit) => {
    setUnitState(next);
    saveTempUnit(next);
  }, []);

  return [unit, setUnit];
}
