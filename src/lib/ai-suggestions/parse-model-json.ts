/**
 * Parses JSON from an LLM reply, stripping optional ```json fences.
 */
export function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}
