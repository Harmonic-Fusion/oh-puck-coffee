"use client";

import type { ErrorInfo } from "react";
import { ClientErrorActions } from "./ClientErrorActions";
import { ClientErrorFallbackShell } from "./ClientErrorFallbackShell";

interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReload: () => void;
}

export function ErrorBoundaryFallback({
  error,
  errorInfo,
  onReload,
}: ErrorBoundaryFallbackProps) {
  return (
    <ClientErrorFallbackShell
      message={error.message || "An unexpected error occurred"}
    >
      <ClientErrorActions
        error={error}
        errorInfo={errorInfo}
        onReload={onReload}
      />
    </ClientErrorFallbackShell>
  );
}
