"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { LoggerInit } from "@/components/common/LoggerInit";
import { SessionRefetchOnAuth } from "@/components/auth/SessionRefetchOnAuth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <SessionRefetchOnAuth />
      <QueryClientProvider client={queryClient}>
        <LoggerInit />
        <ToastProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
