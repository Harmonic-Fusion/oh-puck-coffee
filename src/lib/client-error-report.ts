/**
 * Builds automated bug-report payloads for the feedback table.
 * `href` may include query parameters that could be sensitive — useful for debugging only.
 */
export interface ClientErrorReportInput {
  error: Error;
  componentStack: string | null;
  digest?: string;
}

export function buildClientErrorSubject(error: Error): string {
  const prefix = "Client error: ";
  const max = 200;
  const rest = max - prefix.length;
  const msg = error.message || "Unknown error";
  const truncated =
    msg.length > rest ? `${msg.slice(0, Math.max(0, rest - 1))}…` : msg;
  return `${prefix}${truncated}`;
}

export function buildClientErrorReportJson(
  input: ClientErrorReportInput,
): string {
  const { error, componentStack, digest } = input;

  const href = typeof window !== "undefined" ? window.location.href : "";
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const commit =
    typeof document !== "undefined"
      ? document
          .querySelector('meta[name="commit-sha"]')
          ?.getAttribute("content") ?? null
      : null;

  const payload = {
    kind: "client_error" as const,
    timestamp: new Date().toISOString(),
    commit,
    digest: digest ?? null,
    href,
    pathname,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    viewport:
      typeof window !== "undefined"
        ? { width: window.innerWidth, height: window.innerHeight }
        : null,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    },
    componentStack,
  };

  return JSON.stringify(payload, null, 2);
}
