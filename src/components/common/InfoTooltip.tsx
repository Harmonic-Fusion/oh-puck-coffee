"use client";

import { useState, useRef, useEffect } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface InfoTooltipProps {
  /**
   * The help text to display in the tooltip
   */
  helpText: string;
  /**
   * Optional custom className for the trigger element
   */
  className?: string;
  /**
   * Optional label for the info icon (for accessibility)
   * Defaults to "Show help"
   */
  ariaLabel?: string;
}

/**
 * Reusable InfoTooltip component with info icon
 * Displays help content in a tooltip on click
 * Accessible with keyboard navigation and screen reader support
 */
export function InfoTooltip({
  helpText,
  className = "",
  ariaLabel = "Show help",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Calculate tooltip position
  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Check if tooltip would overflow bottom of viewport
      if (triggerRect.bottom + tooltipRect.height + 8 > viewportHeight) {
        setPosition("top");
      } else {
        setPosition("bottom");
      }
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? "tooltip-content" : undefined}
        className={`inline-flex items-center justify-center text-stone-500 hover:text-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded ${className}`}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={`absolute z-50 w-64 rounded-lg bg-stone-800 px-3 py-2 text-xs leading-relaxed text-stone-100 shadow-lg dark:bg-stone-700 ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } left-1/2 -translate-x-1/2`}
          onKeyDown={handleKeyDown}
        >
          {helpText}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              position === "top"
                ? "top-full border-t-stone-800 dark:border-t-stone-700"
                : "bottom-full border-b-stone-800 dark:border-b-stone-700"
            }`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
