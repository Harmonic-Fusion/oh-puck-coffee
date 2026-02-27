"use client";

import { useRef, useCallback, useMemo, useState } from "react";

interface SliderProps {
  value: number;
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
  const percentage = ((value - min) / (max - min)) * 100;
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
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      setHasInteracted(true);
      snapToStep(e.clientX);
    },
    [disabled, snapToStep]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let newValue = value;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        newValue = Math.min(max, value + step);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        newValue = Math.max(min, value - step);
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
    [disabled, value, min, max, step, onChange]
  );

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
            {label}
          </span>
          {showValue && value > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-md font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {value} / {max}
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
        aria-valuenow={value}
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
                <img
                  src="/logos/logo_complex.png"
                  alt=""
                  className="h-16 w-16"
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
                  hasInteracted && stepValue <= value + 0.01
                    ? ""
                    : "bg-stone-300 dark:bg-stone-600"
                }`}
                style={
                  hasInteracted && stepValue <= value + 0.01
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
