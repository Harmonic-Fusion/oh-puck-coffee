"use client";

import { useRef, useCallback } from "react";

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
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;

  const handleInteraction = useCallback(
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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleInteraction(e.clientX);
    },
    [disabled, handleInteraction]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.buttons === 0) return; // not pressed
      handleInteraction(e.clientX);
    },
    [disabled, handleInteraction]
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
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {value} / {max}
            </span>
          )}
        </div>
      )}

      {/* Custom slider */}
      <div className="flex items-center gap-4">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          aria-disabled={disabled}
          className={`relative h-14 flex-1 cursor-pointer select-none touch-none ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
        >
          {/* Track background */}
          <div className="absolute top-1/2 right-0 left-0 h-3 -translate-y-1/2 rounded-full bg-stone-200 dark:bg-stone-700">
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Thumb — logo with background */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-75"
            style={{ left: `${percentage}%` }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-stone-800">
              <img
                src="/logos/logo_complex.png"
                alt=""
                className="h-12 w-12"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tick marks - only show whole numbers */}
      <div className="mt-2 flex justify-between px-[18px]">
        {Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => {
          const tickValue = min + i * step;
          // Only show whole numbers, hide half intervals
          if (tickValue % 1 !== 0) return null;
          return (
            <span
              key={tickValue}
              className="text-xs text-stone-400 dark:text-stone-500"
            >
              {tickValue}
            </span>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
