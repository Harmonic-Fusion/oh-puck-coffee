"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BrewTimerProps {
  value: number | undefined;
  onChange: (value: number) => void;
  className?: string;
}

export function BrewTimer({ value, onChange, className }: BrewTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const offsetRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (startTimeRef.current === null) return;
    const now = performance.now();
    const secs = offsetRef.current + (now - startTimeRef.current) / 1000;
    onChange(parseFloat(secs.toFixed(1)));
    rafRef.current = requestAnimationFrame(tick);
  }, [onChange]);

  const handlePlay = useCallback(() => {
    offsetRef.current = value ?? 0;
    startTimeRef.current = performance.now();
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, value]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={isRunning ? handlePause : handlePlay}
      className={`${className ?? "flex h-32 w-32 flex-shrink-0"} items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${
        isRunning
          ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          : "border-stone-300 bg-transparent text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-transparent dark:text-stone-300 dark:hover:bg-stone-800/50"
      }`}
      tabIndex={-1}
      aria-label={isRunning ? "Pause timer" : "Start timer"}
    >
      {isRunning ? (
        <>
          <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          {className && <span className="ml-2 text-xl font-semibold">Pause</span>}
        </>
      ) : (
        <>
          <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {className && <span className="ml-2 text-xl font-semibold">Start Timer</span>}
        </>
      )}
    </button>
  );
}
