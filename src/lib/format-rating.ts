/**
 * Rating label mapping (1-5)
 */
export const RATING_LABELS: Record<number, string> = {
  1: "Undrinkable",
  2: "Didn't Enjoy",
  3: "Enjoyed",
  4: "Really Enjoyed",
  5: "Loved It",
};

/**
 * Gets the label for a numeric rating (1-5).
 * Rounds to nearest integer for label lookup.
 */
export function getRatingLabel(rating: number | null | undefined): string | null {
  if (rating == null) return null;
  const rounded = Math.round(rating);
  return RATING_LABELS[rounded] ?? null;
}

/**
 * Formats a numeric rating (1-5) with its text label.
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return "";
  const label = getRatingLabel(rating);
  if (label == null) return "";
  return label;
}
