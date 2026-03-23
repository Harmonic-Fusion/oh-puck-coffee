"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import Image from "next/image";

const HOLD_DELAY_MS = 200;
const DRAG_THRESHOLD_PX = 10;

// Only one slider gesture may be active at a time across all instances.
// Prevents leaked window listeners from driving two sliders simultaneously.
let activeGestureCleanup: (() => void) | null = null;

function clearSelectionAndBlurFormFields() {
  window.getSelection()?.removeAllRanges();
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    active.blur();
  }
}

interface SliderProps {
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
  showValue?: boolean;
  labels?: Record<number, string>; // Map of integer values to label text
  id?: string;
  thumbColor?: string; // Optional color for thumb dot (replaces logo)
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  label,
  error,
  disabled = false,
  showValue = true,
  labels,
  id,
  thumbColor,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const hasValue = value != null;
  const currentValue = hasValue ? value : min;
  const percentage = ((currentValue - min) / (max - min)) * 100;
  const trackColor = thumbColor || "rgb(245 158 11)"; // amber-500 default

  // Build all step positions
  const steps = useMemo(() => {
    const result: number[] = [];
    const count = Math.round((max - min) / step);
    for (let i = 0; i <= count; i++) {
      result.push(min + i * step);
    }
    return result;
  }, [min, max, step]);

  const snapToStep = useCallback(
    (clientX: number) => {
      if (disabled || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      const clamped = Math.max(min, Math.min(max, stepped));
      onChange(clamped);
    },
    [disabled, min, max, step, onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      clearSelectionAndBlurFormFields();

      // Tear down any in-flight gesture (this or another slider instance)
      activeGestureCleanup?.();

      if (!trackRef.current) return;
      const track = trackRef.current as HTMLDivElement;

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      let armed = false;

      const ac = new AbortController();
      let holdTimer: ReturnType<typeof setTimeout> | undefined;

      function cleanup() {
        if (activeGestureCleanup === cleanup) {
          activeGestureCleanup = null;
        }
        ac.abort();
        if (holdTimer !== undefined) {
          clearTimeout(holdTimer);
          holdTimer = undefined;
        }
        try {
          if (track.hasPointerCapture(pointerId)) {
            track.releasePointerCapture(pointerId);
          }
        } catch {
          // ignore — element may have disconnected
        }
      }

      activeGestureCleanup = cleanup;

      function arm(clientX: number) {
        if (armed) return;
        armed = true;
        setHasInteracted(true);
        snapToStep(clientX);
        try {
          track.setPointerCapture(pointerId);
        } catch {
          // setPointerCapture can throw if element disconnected
        }
      }

      function onMove(ev: PointerEvent) {
        if (ev.pointerId !== pointerId) return;
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);
        if (!armed && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
          if (holdTimer !== undefined) {
            clearTimeout(holdTimer);
            holdTimer = undefined;
          }
          arm(ev.clientX);
        } else if (armed) {
          snapToStep(ev.clientX);
        }
      }

      function onUp(ev: PointerEvent) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
      }

      holdTimer = setTimeout(() => {
        holdTimer = undefined;
        if (!armed) {
          arm(startX);
        }
      }, HOLD_DELAY_MS);

      const opts = { signal: ac.signal };
      window.addEventListener("pointermove", onMove, opts);
      window.addEventListener("pointerup", onUp, opts);
      window.addEventListener("pointercancel", onUp, opts);
    },
    [disabled, snapToStep]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let newValue = currentValue;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        newValue = Math.min(max, currentValue + step);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        newValue = Math.max(min, currentValue - step);
      } else if (e.key === "Home") {
        newValue = min;
      } else if (e.key === "End") {
        newValue = max;
      } else {
        return;
      }
      e.preventDefault();
      setHasInteracted(true);
      onChange(newValue);
    },
    [disabled, currentValue, min, max, step, onChange]
  );

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
            {label}
          </span>
          {showValue && hasValue && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-md font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {currentValue} / {max}
            </span>
          )}
        </div>
      )}

      <div className="px-6">
      {/* Track bar with thumb */}
      <div
        id={id}
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={hasValue ? currentValue : undefined}
        aria-label={label}
        aria-disabled={disabled}
        className={`relative h-14 cursor-pointer select-none touch-none ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        {/* Track background */}
        <div className="absolute top-1/2 right-0 left-0 h-3 -translate-y-1/2 rounded-full bg-stone-200 dark:bg-stone-700">
          {/* Filled portion */}
          {hasInteracted && (
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
              style={{ width: `${percentage}%`, backgroundColor: trackColor }}
            />
          )}
        </div>

        {/* Thumb — logo icon or colored dot (hidden until first interaction) */}
        {hasInteracted && (
          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-75"
            style={{ left: `${percentage}%` }}
          >
            {thumbColor ? (
              <div
                className="h-16 w-16 rounded-full shadow-lg border-4 border-white dark:border-stone-800"
                style={{ backgroundColor: thumbColor }}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg dark:bg-stone-800">
                <Image
                  src="/logos/logo_complex.png"
                  alt=""
                  width={64}
                  height={64}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tick points with numbers and labels */}
      <div className="mt-1 flex justify-between">
        {steps.map((stepValue) => {
          const isWhole = stepValue % 1 === 0;
          const labelText = isWhole ? labels?.[stepValue] : undefined;

          return (
            <button
              key={stepValue}
              type="button"
              tabIndex={-1}
              onClick={() => {
                if (disabled) return;
                clearSelectionAndBlurFormFields();
                setHasInteracted(true);
                onChange(stepValue);
              }}
              className={`flex w-0 flex-col items-center ${!disabled ? "cursor-pointer" : ""}`}
            >
              {/* Tick dot */}
              <div
                className={`rounded-full ${
                  isWhole ? "h-2 w-2" : "h-1 w-1"
                } ${
                  hasInteracted && stepValue <= currentValue + 0.01
                    ? ""
                    : "bg-stone-300 dark:bg-stone-600"
                }`}
                style={
                  hasInteracted && stepValue <= currentValue + 0.01
                    ? { backgroundColor: trackColor }
                    : undefined
                }
              />

              {/* Number + label for whole numbers */}
              {isWhole && (
                <>
                  <span className="mt-1 text-xl font-medium text-stone-500 dark:text-stone-400">
                    {stepValue}
                  </span>
                  {labelText && (
                    <span
                      className="mt-0.5 text-center text-[10px] leading-tight text-stone-400 dark:text-stone-500"
                      style={{ wordSpacing: "100vw" }}
                      title={labelText}
                    >
                      {labelText}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
