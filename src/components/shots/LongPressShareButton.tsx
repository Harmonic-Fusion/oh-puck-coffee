"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/common/Button";
import { buildShareText, type ShareFormat, type ShotShareData } from "@/lib/share-text";
import type { TempUnit } from "@/lib/format-numbers";

interface LongPressShareButtonProps {
  shotData: ShotShareData;
  tempUnit: TempUnit;
  shareUrl: string;
  onShare: (text: string) => Promise<void>;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

const LONG_PRESS_DURATION = 500; // milliseconds

export function LongPressShareButton({
  shotData,
  tempUnit,
  shareUrl,
  onShare,
  className = "",
  variant = "primary",
  size = "md",
  children = "Share",
}: LongPressShareButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredLongPressRef = useRef(false);
  const clickEventRef = useRef<MouseEvent | null>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isMenuOpen]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    hasTriggeredLongPressRef.current = false;
    clickEventRef.current = null;
    longPressTimerRef.current = setTimeout(() => {
      if (buttonRef.current && containerRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const menuHeight = 120; // Approximate menu height
        const menuWidth = 200; // Menu width from min-w-[200px]

        // Position below button by default
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left;

        // If menu would overflow bottom, position above
        if (top + menuHeight > viewportHeight) {
          top = buttonRect.top - menuHeight - 8;
        }

        // If menu would overflow right, align to right edge
        if (left + menuWidth > viewportWidth) {
          left = viewportWidth - menuWidth - 8;
        }

        // Ensure menu doesn't go off left edge
        if (left < 8) {
          left = 8;
        }

        setMenuPosition({ top, left });
        setIsMenuOpen(true);
        hasTriggeredLongPressRef.current = true;
      }
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    // Prevent click if menu is open or sharing is in progress
    if (isMenuOpen || isSharing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // If long press was triggered, don't trigger short click
    if (hasTriggeredLongPressRef.current) {
      hasTriggeredLongPressRef.current = false;
      return;
    }

    // Short click: trigger default "standard" share
    setIsSharing(true);
    try {
      const text = buildShareText({ ...shotData, url: shareUrl }, tempUnit, "standard");
      await onShare(text);
    } finally {
      setIsSharing(false);
    }
  }, [shotData, shareUrl, tempUnit, onShare, isMenuOpen, isSharing]);

  const handleFormatSelect = useCallback(
    async (format: ShareFormat, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent multiple concurrent share calls
      if (isSharing) return;
      
      setIsMenuOpen(false);
      setIsSharing(true);
      try {
        const text = buildShareText({ ...shotData, url: shareUrl }, tempUnit, format);
        await onShare(text);
      } finally {
        setIsSharing(false);
      }
    },
    [shotData, shareUrl, tempUnit, onShare, isSharing]
  );

  const handleCopy = useCallback(
    async (format: ShareFormat, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isSharing) return;
      
      setIsSharing(true);
      try {
        const text = buildShareText({ ...shotData, url: shareUrl }, tempUnit, format);
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Error copying to clipboard:", err);
      } finally {
        setIsSharing(false);
      }
    },
    [shotData, shareUrl, tempUnit, isSharing]
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Button
        ref={buttonRef}
        type="button"
        variant={variant}
        size={size}
        className="w-full"
        disabled={isSharing}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        {children}
      </Button>

      {isMenuOpen && menuPosition && (
        <div
          className="fixed z-50 min-w-[200px] rounded-xl border-2 border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <div className="py-1">
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-700">
              <button
                type="button"
                onClick={(e) => handleFormatSelect("short", e)}
                disabled={isSharing}
                className="flex-1 text-left text-sm text-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-200"
              >
                ☕ Short & Sweet
              </button>
              <button
                type="button"
                onClick={(e) => handleCopy("short", e)}
                disabled={isSharing}
                className="flex-shrink-0 rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-400 dark:hover:bg-stone-600 dark:hover:text-stone-200"
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-700">
              <button
                type="button"
                onClick={(e) => handleFormatSelect("standard", e)}
                disabled={isSharing}
                className="flex-1 text-left text-sm text-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-200"
              >
                🤙 Puck Ya
              </button>
              <button
                type="button"
                onClick={(e) => handleCopy("standard", e)}
                disabled={isSharing}
                className="flex-shrink-0 rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-400 dark:hover:bg-stone-600 dark:hover:text-stone-200"
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-700">
              <button
                type="button"
                onClick={(e) => handleFormatSelect("ridiculous", e)}
                disabled={isSharing}
                className="flex-1 text-left text-sm text-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-200"
              >
                🏆 Glorious!!!
              </button>
              <button
                type="button"
                onClick={(e) => handleCopy("ridiculous", e)}
                disabled={isSharing}
                className="flex-shrink-0 rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-stone-400 dark:hover:bg-stone-600 dark:hover:text-stone-200"
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
