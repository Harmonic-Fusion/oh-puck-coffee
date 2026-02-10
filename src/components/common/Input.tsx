"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-14 w-full rounded-xl border-2 px-4 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 ${
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-stone-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
