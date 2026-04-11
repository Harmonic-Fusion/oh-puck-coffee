/** Prefer Postgres `detail` (e.g. duplicate key); combine with `error` when both differ. */
export function messageFromApiErrorBody(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const o = data as Record<string, unknown>;
  const detail = typeof o.detail === "string" ? o.detail.trim() : "";
  const error = typeof o.error === "string" ? o.error.trim() : "";
  if (detail && error && detail !== error) return `${error}: ${detail}`;
  if (detail) return detail;
  if (error) return error;
  return "Request failed";
}
