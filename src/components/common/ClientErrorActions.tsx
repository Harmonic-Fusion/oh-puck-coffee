"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import type { ErrorInfo } from "react";
import { ApiRoutes } from "@/app/routes";
import {
  buildClientErrorReportJson,
  buildClientErrorSubject,
} from "@/lib/client-error-report";
import { useToast } from "./Toast";

interface ClientErrorActionsProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  digest?: string;
  onReload: () => void;
  reloadLabel?: string;
}

export function ClientErrorActions({
  error,
  errorInfo,
  digest,
  onReload,
  reloadLabel = "Reload Page",
}: ClientErrorActionsProps) {
  const { status } = useSession();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [logged, setLogged] = useState(false);

  async function handleLogEvent() {
    if (status !== "authenticated" || pending || logged) {
      return;
    }
    setPending(true);
    try {
      const message = buildClientErrorReportJson({
        error,
        componentStack: errorInfo?.componentStack ?? null,
        digest,
      });
      const subject = buildClientErrorSubject(error);
      const res = await fetch(ApiRoutes.feedback.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "client_error",
          type: "bug",
          subject,
          message,
        }),
      });
      if (!res.ok) {
        const err: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof err === "object" &&
          err !== null &&
          "error" in err &&
          typeof (err as { error: unknown }).error === "string"
            ? (err as { error: string }).error
            : "Failed to log event";
        throw new Error(msg);
      }
      setLogged(true);
      showToast("success", "Thank you!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log event";
      showToast("error", msg);
    } finally {
      setPending(false);
    }
  }

  const logDisabled = status !== "authenticated" || pending || logged;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onReload}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {reloadLabel}
        </button>
        <button
          type="button"
          onClick={handleLogEvent}
          disabled={logDisabled}
          title={
            status !== "authenticated"
              ? "Sign in to report this error"
              : undefined
          }
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/30"
        >
          {logged ? "Logged" : pending ? "Logging…" : "Log Event"}
        </button>
      </div>
      {status !== "authenticated" ? (
        <p className="text-center text-xs text-red-600 dark:text-red-400">
          Sign in to send an error report.
        </p>
      ) : null}
    </div>
  );
}
