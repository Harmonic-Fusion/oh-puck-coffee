"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ── Press-and-hold repeat constants ──────────────────────────────────────────
const REPEAT_DELAY = 400; // ms before auto-repeat starts
const REPEAT_INTERVAL = 150; // ms between ticks at normal speed
const FAST_INTERVAL = 75; // ms between ticks at 2× speed (doubles after hold)
const ACCELERATE_AFTER = 2000; // ms from press-start to switch to fast speed

/**
 * Fires `callback` once on pointer-down, then auto-repeats while held.
 * After {@link ACCELERATE_AFTER} ms the repeat speed doubles.
 */
function usePressRepeat(callback: () => void, disabled: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accelRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (accelRef.current) {
      clearTimeout(accelRef.current);
      accelRef.current = null;
    }
  }, []);

  // Stop repeating if the button becomes disabled mid-press (e.g. hit min/max)
  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  // Clean up on unmount
  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({
      onPointerDown: () => {
        if (disabled) return;
        // Fire once immediately
        cbRef.current();
        // After a delay, start repeating at normal speed
        timeoutRef.current = setTimeout(() => {
          intervalRef.current = setInterval(
            () => cbRef.current(),
            REPEAT_INTERVAL
          );
          // After 2 s total, switch to 2× speed
          accelRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(
              () => cbRef.current(),
              FAST_INTERVAL
            );
          }, ACCELERATE_AFTER - REPEAT_DELAY);
        }, REPEAT_DELAY);
      },
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      // Prevent context-menu on mobile long-press
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [disabled, stop]
  );
}

interface NumberStepperProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  /** Secondary suffix shown in smaller text after the main suffix (e.g. converted temperature) */
  secondarySuffix?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** Extra content rendered after the label (e.g. ratio quick-select buttons) */
  labelExtra?: React.ReactNode;
  /** If true, preserves exact values without rounding (useful for precise measurements like time) */
  noRound?: boolean;
  /** When value is empty, show a clickable button instead of the placeholder */
  placeholderAction?: { label: string; onClick: () => void };
  /** Always-visible subtitle shown below the label (e.g. computed ratio, flow rate) */
  subtitle?: string;
  id?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  suffix,
  secondarySuffix,
  placeholder = "—",
  error,
  disabled = false,
  labelExtra,
  noRound = false,
  placeholderAction,
  subtitle,
  id,
}: NumberStepperProps) {
  const [localValue, setLocalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(24);

  // Derive decimal precision from step
  const decimals = step.toString().includes(".")
    ? step.toString().split(".")[1].length
    : 0;

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

  // Sync display value from prop when input is not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value != null ? formatValue(value) : "");
    }
  }, [value, isFocused, formatValue]);

  // The text currently shown in the input (used for auto-sizing)
  const displayText = isFocused
    ? localValue
    : value != null
      ? formatValue(value)
      : "";

  // Measure text width so the input auto-sizes to its content
  useEffect(() => {
    if (sizerRef.current) {
      setInputWidth(Math.max(24, sizerRef.current.scrollWidth + 4));
    }
  }, [displayText, placeholder]);

  const commitValue = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed === "") {
        onChange(undefined);
      } else {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) {
          const final = noRound
            ? parsed
            : parseFloat(parsed.toFixed(decimals));
          onChange(clamp(final));
        }
      }
    },
    [onChange, clamp, decimals, noRound]
  );

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const current = value ?? min;
    const raw = current - step;
    const next = noRound
      ? clamp(raw)
      : clamp(parseFloat(raw.toFixed(decimals)));
    onChange(next);
  }, [disabled, value, min, step, decimals, clamp, onChange, noRound]);

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const current = value ?? min;
    const raw = current + step;
    const next = noRound
      ? clamp(raw)
      : clamp(parseFloat(raw.toFixed(decimals)));
    onChange(next);
  }, [disabled, value, min, step, decimals, clamp, onChange, noRound]);

  // Determine whether the buttons can fire
  const canDecrement = value != null && value > min;
  const canIncrement = value == null || value < max;

  // Press-and-hold auto-repeat for the −/+ buttons
  const decrementPress = usePressRepeat(
    handleDecrement,
    disabled || !canDecrement
  );
  const incrementPress = usePressRepeat(
    handleIncrement,
    disabled || !canIncrement
  );

  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsFocused(true);
    setLocalValue(value != null ? formatValue(value) : "");
    requestAnimationFrame(() => inputRef.current?.select());
  }, [disabled, value, formatValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    commitValue(localValue);
  }, [localValue, commitValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitValue(localValue);
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        setLocalValue(value != null ? formatValue(value) : "");
        inputRef.current?.blur();
      }
    },
    [localValue, commitValue, formatValue, value]
  );

  // Show placeholder action button when empty and not focused
  const showPlaceholderAction =
    !isFocused && value == null && placeholderAction != null;

  return (
    <div className="w-full">
      {/* Label row */}
      {(label || labelExtra) && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between">
            {label && (
              <span
                className="text-base font-semibold text-stone-800 dark:text-stone-200"
                tabIndex={-1}
              >
                {label}
              </span>
            )}
            {labelExtra}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm font-medium text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Stepper controls */}
      <div className="flex items-center gap-2">
        {/* Value input */}
        <div
          id={id}
          className={`flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl border-2 transition-colors ${
            isFocused
              ? "border-amber-500 bg-white ring-2 ring-amber-500/20 dark:bg-stone-900"
              : error
                ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                : "border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800"
          }`}
        >
          {showPlaceholderAction ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                placeholderAction.onClick();
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
            >
              {placeholderAction.label}
            </button>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              {/* Hidden sizer span — mirrors input text to measure its rendered width */}
              <span
                ref={sizerRef}
                className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre text-lg font-semibold"
                aria-hidden="true"
              >
                {displayText || placeholder}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={displayText}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={label ?? "Value"}
                style={{ width: `${inputWidth}px` }}
                className="h-full min-w-0 bg-transparent text-right text-lg font-semibold text-stone-900 outline-none placeholder:text-center placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              {(suffix || secondarySuffix) && (displayText.length > 0) && (
                <span className="pointer-events-none flex-shrink-0 pl-1">
                  {suffix && (
                    <span className="text-sm font-normal text-stone-400 dark:text-stone-500">
                      {suffix}
                    </span>
                  )}
                  {secondarySuffix && (
                    <small className="ml-1 text-xs font-normal text-stone-400 dark:text-stone-500">
                      {secondarySuffix}
                    </small>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Decrement & Increment buttons side-by-side */}
        <div className="flex gap-1">
          <button
            type="button"
            {...decrementPress}
            disabled={disabled || !canDecrement}
            aria-label={`Decrease ${label ?? "value"}`}
            tabIndex={-1}
            className="flex h-16 w-16 flex-shrink-0 select-none items-center justify-center rounded-xl border-2 border-stone-300 bg-stone-50 text-2xl font-bold text-stone-600 transition-all active:scale-95 active:bg-stone-200 disabled:opacity-30 disabled:active:scale-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:active:bg-stone-700"
          >
            −
          </button>
          <button
            type="button"
            {...incrementPress}
            disabled={disabled || !canIncrement}
            aria-label={`Increase ${label ?? "value"}`}
            tabIndex={-1}
            className="flex h-16 w-16 flex-shrink-0 select-none items-center justify-center rounded-xl border-2 border-stone-300 bg-stone-50 text-2xl font-bold text-stone-600 transition-all active:scale-95 active:bg-stone-200 disabled:opacity-30 disabled:active:scale-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:active:bg-stone-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
