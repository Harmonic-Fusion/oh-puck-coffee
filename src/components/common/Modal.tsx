"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function Modal({ open, onClose, title, header, children, footer, fullHeight = false, leftSlot, rightSlot }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={`relative mx-auto flex w-[80vw] max-w-4xl flex-col rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900 ${
        fullHeight ? "h-[90vh]" : "max-h-[90vh]"
      }`}>
        {(title || header) && (
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
            {header || (
              <>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
        <div className="relative flex flex-1 min-h-0">
          {leftSlot && (
            <div className="absolute left-0 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-shrink-0 items-center justify-center py-4">
              {leftSlot}
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-0">
              {children}
            </div>
          </div>
          {rightSlot && (
            <div className="absolute right-0 top-1/2 z-10 flex translate-x-1/2 -translate-y-1/2 flex-shrink-0 items-center justify-center py-4">
              {rightSlot}
            </div>
          )}
        </div>
        {footer && (
          <div className="border-t border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
