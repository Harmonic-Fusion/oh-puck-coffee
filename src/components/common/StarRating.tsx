"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  label,
  error,
  disabled = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="w-full">
      {label && (
        <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          {label}
        </span>
      )}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 text-2xl transition-colors disabled:cursor-not-allowed"
          >
            <span
              className={
                star <= (hovered || value)
                  ? "text-amber-500"
                  : "text-stone-300 dark:text-stone-600"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
