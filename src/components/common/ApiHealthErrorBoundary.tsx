"use client";

import type { ErrorInfo } from "react";
import { useEffect, useRef, ReactNode } from "react";
import { ApiRoutes } from "@/app/routes";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useToast } from "@/components/common/Toast";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(ApiRoutes.health.path);
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}

interface ApiHealthErrorBoundaryProps {
  children: ReactNode;
}

export function ApiHealthErrorBoundary({ children }: ApiHealthErrorBoundaryProps) {
  const { showToast } = useToast();
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      const healthy = await checkHealth();
      if (!healthy && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        showToast(
          "error",
          "API is unavailable. Please check your connection and try again.",
          0
        );
      } else if (healthy) {
        hasNotifiedRef.current = false;
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [showToast]);

  function handleError(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
