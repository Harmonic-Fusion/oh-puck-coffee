"use client";

import { useState, useRef, useEffect } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** PNG thumbnail from API (`thumbnailBase64`); rendered as a data URL. */
  thumbnailBase64?: string | null;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  isLoading?: boolean;
  error?: string;
  onAddNew?: (searchText: string) => void;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search...",
  isLoading = false,
  error,
  onAddNew,
  emptyMessage = "No items found",
  className = "",
  disabled = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  function thumbSrc(b64: string | null | undefined): string | undefined {
    if (!b64) return undefined;
    return `data:image/png;base64,${b64}`;
  }

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery("");
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={`flex h-16 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 text-left text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
          error
            ? "border-red-400"
            : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
        } ${isOpen ? "ring-2 ring-amber-500" : ""} ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span
          className={`flex min-w-0 flex-1 items-center gap-2 ${selectedOption ? "" : "text-stone-400"}`}
        >
          {selectedOption?.thumbnailBase64 ? (
            // Thumbnails are inline data URLs or small API paths; skip next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc(selectedOption.thumbnailBase64)}
              alt=""
              className="h-8 w-8 shrink-0 rounded-md object-cover"
            />
          ) : null}
          <span className="min-w-0 truncate">
            {selectedOption
              ? selectedOption.label
              : isLoading
                ? "Loading..."
                : placeholder}
          </span>
        </span>
        <span className="shrink-0 text-stone-400" aria-hidden>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800">
          {/* Search input */}
          <div className="border-b border-stone-200 p-2 dark:border-stone-700">
            <input
              ref={inputRef}
              type="text"
              tabIndex={-1}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
            />
          </div>

          {/* Scrollable list */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-stone-500">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-stone-500">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-700 ${
                    option.value === value
                      ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "text-stone-800 dark:text-stone-200"
                  }`}
                >
                  {option.thumbnailBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbSrc(option.thumbnailBase64)}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded bg-stone-200 dark:bg-stone-700" />
                  )}
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>

          {/* Deselect and Add new buttons */}
          {(value || onAddNew) && (
            <div className="border-t border-stone-200 p-2 dark:border-stone-700 flex gap-2">
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex-1 rounded-md border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Deselect
                </button>
              )}
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    const text = searchQuery;
                    setIsOpen(false);
                    setSearchQuery("");
                    onAddNew(text);
                  }}
                  className="flex-1 rounded-md border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  + Add New
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
