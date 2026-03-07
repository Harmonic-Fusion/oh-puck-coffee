"use client";

import type { ErrorInfo } from "react";
import { useEffect, useRef, useCallback, ReactNode } from "react";
import { ApiRoutes } from "@/app/routes";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useToast } from "@/components/common/Toast";

const RETRY_COUNT = 3;
const RETRY_INTERVAL_MS = 1000;

async function checkHealth(): Promise<boolean> {
  const res = await fetch(ApiRoutes.health.path);
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "ok";
}

async function checkHealthWithRetries(
  retries: number,
  intervalMs: number
): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const ok = await checkHealth();
      if (ok) return true;
    } catch {
      // ignore and retry
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return false;
}

interface ApiHealthErrorBoundaryProps {
  children: ReactNode;
}

export function ApiHealthErrorBoundary({ children }: ApiHealthErrorBoundaryProps) {
  const { showToast } = useToast();
  const hasNotifiedRef = useRef(false);

  const runHealthCheck = useCallback(() => {
    if (hasNotifiedRef.current) return;
    checkHealthWithRetries(RETRY_COUNT, RETRY_INTERVAL_MS).then((healthy) => {
      if (!healthy && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        showToast(
          "error",
          "API is unavailable. Please check your connection and try again.",
          0
        );
      }
    });
  }, [showToast]);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  function handleError(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
    runHealthCheck();
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
