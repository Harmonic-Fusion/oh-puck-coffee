"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface NumberStepperProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  label?: string;
  suffix?: string;
  /** Secondary suffix shown in smaller text after the main suffix (e.g. converted temperature) */
  secondarySuffix?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Extra content rendered after the label (e.g. ratio quick-select buttons) */
  labelExtra?: React.ReactNode;
  /** If true, preserves exact values without rounding (useful for precise measurements like time) */
  noRound?: boolean;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  precision,
  label,
  suffix,
  secondarySuffix,
  placeholder = "—",
  error,
  hint,
  disabled = false,
  labelExtra,
  noRound = false,
}: NumberStepperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive decimal precision from step if not explicitly provided
  const decimals =
    precision ??
    (step.toString().includes(".")
      ? step.toString().split(".")[1].length
      : 0);

  const formatValue = useCallback(
    (v: number) => {
      if (noRound) {
        // For noRound, show the value with up to 4 decimal places, removing trailing zeros
        const formatted = v.toFixed(4);
        return formatted.replace(/\.?0+$/, "");
      }
      return v.toFixed(decimals);
    },
    [decimals, noRound]
  );

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max]
  );

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const current = value ?? min;
    const raw = current - step;
    const next = noRound ? clamp(raw) : clamp(parseFloat(raw.toFixed(decimals)));
    onChange(next);
  }, [disabled, value, min, step, decimals, clamp, onChange, noRound]);

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const current = value ?? min;
    const raw = current + step;
    const next = noRound ? clamp(raw) : clamp(parseFloat(raw.toFixed(decimals)));
    onChange(next);
  }, [disabled, value, min, step, decimals, clamp, onChange, noRound]);

  // Enter editing mode when value is tapped
  const startEditing = useCallback(() => {
    if (disabled) return;
    setEditValue(value != null ? formatValue(value) : "");
    setIsEditing(true);
  }, [disabled, value, formatValue]);

  // Focus the input once editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed === "") {
      onChange(undefined);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      const final = noRound ? parsed : parseFloat(parsed.toFixed(decimals));
      onChange(clamp(final));
    }
  }, [editValue, onChange, clamp, decimals, noRound]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [commitEdit]
  );

  const handleValueDisplayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startEditing();
      }
    },
    [startEditing]
  );

  const canDecrement = value != null && value > min;
  const canIncrement = value == null || value < max;

  return (
    <div className="w-full">
      {/* Label row */}
      {(label || labelExtra) && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between">
            {label && (
              <span className="text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
                {label}
              </span>
            )}
            {labelExtra}
          </div>
          {hint && !error && (
            <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
          )}
        </div>
      )}

      {/* Stepper controls */}
      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          aria-label={`Decrease ${label ?? "value"}`}
          tabIndex={-1}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-stone-50 text-2xl font-bold text-stone-600 transition-all active:scale-95 active:bg-stone-200 disabled:opacity-30 disabled:active:scale-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:active:bg-stone-700"
        >
          −
        </button>

        {/* Value display / editable input */}
        <div
          onClick={startEditing}
          onKeyDown={handleValueDisplayKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="textbox"
          aria-label={label ?? "Value"}
          className={`flex h-14 min-w-0 flex-1 cursor-text items-center justify-center rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
            isEditing
              ? "border-amber-500 bg-white ring-2 ring-amber-500/20 dark:bg-stone-900"
              : error
                ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                : "border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800"
          }`}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              className="h-full w-full bg-transparent text-center text-lg font-semibold text-stone-900 outline-none dark:text-stone-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ MozAppearance: "textfield" }}
            />
          ) : (
            <span
              className={`text-lg font-semibold ${
                value != null
                  ? "text-stone-900 dark:text-stone-100"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {value != null ? formatValue(value) : placeholder}
              {value != null && suffix && (
                <span className="ml-1 text-sm font-normal text-stone-400 dark:text-stone-500">
                  {suffix}
                </span>
              )}
              {value != null && secondarySuffix && (
                <small className="ml-1 text-xs font-normal text-stone-400 dark:text-stone-500">
                  {secondarySuffix}
                </small>
              )}
            </span>
          )}
        </div>

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          aria-label={`Increase ${label ?? "value"}`}
          tabIndex={-1}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-stone-50 text-2xl font-bold text-stone-600 transition-all active:scale-95 active:bg-stone-200 disabled:opacity-30 disabled:active:scale-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:active:bg-stone-700"
        >
          +
        </button>
      </div>

      {/* Error */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
