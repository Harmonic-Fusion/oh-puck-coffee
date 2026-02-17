"use client";

import { useState, useRef, useEffect } from "react";

interface ComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function ComboboxInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className = "",
}: ComboboxInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(value.toLowerCase()) &&
          s.toLowerCase() !== value.toLowerCase()
      )
    : suggestions;

  const showDropdown = isFocused && filtered.length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    if (isFocused) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFocused]);

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800">
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before onClick fires
                  onChange(suggestion);
                  setIsFocused(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-800 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
