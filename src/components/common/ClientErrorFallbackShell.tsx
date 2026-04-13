"use client";

import type { ReactNode } from "react";

interface ClientErrorFallbackShellProps {
  title?: string;
  message: string;
  children: ReactNode;
}

export function ClientErrorFallbackShell({
  title = "Something Went Wrong",
  message,
  children,
}: ClientErrorFallbackShellProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/20">
      <div className="mb-4 text-4xl">⚠️</div>
      <h2 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
        {title}
      </h2>
      <p className="mb-4 max-w-md text-center text-sm text-red-600 dark:text-red-400">
        {message}
      </p>
      {children}
    </div>
  );
}
