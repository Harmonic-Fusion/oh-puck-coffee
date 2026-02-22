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
  /** Extra button(s) rendered between the value display and the −/+ buttons */
  extraButtons?: React.ReactNode;
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
  extraButtons,
  placeholderAction,
  subtitle,
  id,
}: NumberStepperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Track whether the current interaction is a manual keyboard edit (vs stepper +/− button).
  // When true, pressing Enter commits the edit but does NOT auto-advance to the next field.
  const isManualInput = useRef(false);

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

  // Determine whether the buttons can fire
  const canDecrement = value != null && value > min;
  const canIncrement = value == null || value < max;

  // Press-and-hold auto-repeat for the −/+ buttons
  const decrementPress = usePressRepeat(handleDecrement, disabled || !canDecrement);
  const incrementPress = usePressRepeat(handleIncrement, disabled || !canIncrement);

  // Enter editing mode when value is tapped
  const startEditing = useCallback(() => {
    if (disabled) return;
    isManualInput.current = true;
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

  const containerRef = useRef<HTMLDivElement>(null);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed === "") {
      onChange(undefined);
      isManualInput.current = false;
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      const final = noRound ? parsed : parseFloat(parsed.toFixed(decimals));
      onChange(clamp(final));
    }
    isManualInput.current = false;
  }, [editValue, onChange, clamp, decimals, noRound]);

  /** Advance focus to the next focusable field in the form */
  const focusNextField = useCallback(() => {
    if (!containerRef.current) return;
    const form = containerRef.current.closest("form");
    if (!form) return;
    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>(
        '[tabindex="0"], input:not([tabindex="-1"]):not([disabled]), textarea:not([tabindex="-1"]):not([disabled]), select:not([tabindex="-1"]):not([disabled]), [role="slider"]:not([aria-disabled="true"])'
      )
    ).filter((el) => el.offsetParent !== null); // visible only
    const currentIdx = focusable.findIndex(
      (el) => containerRef.current?.contains(el)
    );
    if (currentIdx !== -1 && currentIdx < focusable.length - 1) {
      focusable[currentIdx + 1].focus();
    }
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Capture before commitEdit resets the flag
        const wasManual = isManualInput.current;
        commitEdit();
        // Only auto-advance to the next field for stepper-driven changes,
        // not when the user is manually typing a value.
        if (!wasManual) {
          requestAnimationFrame(() => focusNextField());
        }
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [commitEdit, focusNextField]
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

  return (
    <div ref={containerRef} className="w-full">
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
          {subtitle && (
            <p className="mt-0.5 text-sm font-medium text-stone-500 dark:text-stone-400">{subtitle}</p>
          )}
        </div>
      )}

      {/* Stepper controls */}
      <div className="flex items-center gap-2">
        {/* Value display / editable input */}
        <div
          id={id}
          onClick={startEditing}
          onKeyDown={handleValueDisplayKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="textbox"
          aria-label={label ?? "Value"}
          className={`flex h-16 min-w-0 flex-1 cursor-text items-center justify-center rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
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
              tabIndex={-1}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              className="h-full w-full bg-transparent text-center text-lg font-semibold text-stone-900 outline-none dark:text-stone-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ MozAppearance: "textfield" }}
            />
          ) : value == null && placeholderAction ? (
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

        {/* Extra buttons (e.g. play/pause timer) */}
        {extraButtons}

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
