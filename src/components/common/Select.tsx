"use client";

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, className = "", id, children, ...props },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`h-14 w-full rounded-xl border-2 px-4 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-100 ${
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ??
            options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
