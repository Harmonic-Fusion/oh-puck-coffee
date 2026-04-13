"use client";

import { useEffect } from "react";
import { ClientErrorActions } from "@/components/common/ClientErrorActions";
import { ClientErrorFallbackShell } from "@/components/common/ClientErrorFallbackShell";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <ClientErrorFallbackShell
      message={error.message || "An unexpected error occurred"}
    >
      <ClientErrorActions
        error={error}
        errorInfo={null}
        digest={error.digest}
        onReload={() => reset()}
        reloadLabel="Try again"
      />
    </ClientErrorFallbackShell>
  );
}
