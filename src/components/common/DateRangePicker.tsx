"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const displayText =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : "Select date range";

  const hasValue = dateFrom || dateTo;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setIsOpen(false);
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - days);
    
    onChange(
      fromDate.toISOString().split("T")[0],
      today.toISOString().split("T")[0]
    );
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 ${
          hasValue
            ? "border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20"
            : "hover:border-stone-400 dark:hover:border-stone-500"
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-stone-400" />
          <span className={hasValue ? "font-medium text-stone-800 dark:text-stone-200" : "text-stone-500"}>
            {displayText}
          </span>
        </div>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] rounded-xl border-2 border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800">
          <div className="p-4">
            {/* Quick select buttons */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(7)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(30)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(90)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Last 90 days
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const yearStart = new Date(today.getFullYear(), 0, 1);
                  onChange(
                    yearStart.toISOString().split("T")[0],
                    today.toISOString().split("T")[0]
                  );
                  setIsOpen(false);
                }}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                This year
              </button>
            </div>

            {/* Date inputs */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-stone-300">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onChange(e.target.value, dateTo)}
                  max={dateTo || undefined}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-stone-300">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onChange(dateFrom, e.target.value)}
                  min={dateFrom || undefined}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
