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

/* Inline espresso cup SVG as a React component */
function EspressoCup({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      className={className}
    >
      {/* White circle background */}
      <circle cx="18" cy="18" r="17" fill="white" />
      <circle
        cx="18"
        cy="18"
        r="16.5"
        fill="none"
        stroke="#d6d3d1"
        strokeWidth="0.75"
      />
      {/* Saucer */}
      <ellipse cx="16" cy="27" rx="10" ry="2" fill="#BCAAA4" />
      {/* Cup body */}
      <path d="M8 12h16l-2 14H10z" fill="#6F4E37" />
      {/* Handle */}
      <path
        d="M24 15c3 0 3 3 3 3.5s0 3-3 3"
        fill="none"
        stroke="#6F4E37"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Coffee surface */}
      <ellipse cx="16" cy="12.5" rx="8" ry="2.5" fill="#3E2723" />
      {/* Crema */}
      <ellipse cx="16" cy="12.5" rx="6" ry="1.5" fill="#8D6E63" opacity="0.5" />
      {/* Steam lines */}
      <path
        d="M12 6c0-2 2-2 2 0s2 2 2 0"
        fill="none"
        stroke="#a8a29e"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M17 7c0-2 2-2 2 0s2 2 2 0"
        fill="none"
        stroke="#a8a29e"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
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
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
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
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
          {min}
        </span>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          aria-disabled={disabled}
          className={`relative h-10 flex-1 cursor-pointer select-none touch-none ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
        >
          {/* Track background */}
          <div className="absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 rounded-full bg-stone-200 dark:bg-stone-700">
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Thumb — espresso cup */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-75"
            style={{ left: `${percentage}%` }}
          >
            <EspressoCup className="h-9 w-9 drop-shadow-md" />
          </div>
        </div>
        <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
          {max}
        </span>
      </div>

      {/* Tick marks */}
      <div className="mt-1 flex justify-between px-[14px]">
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <span
            key={i + min}
            className="text-[10px] text-stone-400 dark:text-stone-500"
          >
            {i + min}
          </span>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
