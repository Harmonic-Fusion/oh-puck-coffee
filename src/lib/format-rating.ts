/**
 * Formats a numeric rating (1-5) with star emojis.
 * Rounds up: 1.5 = ⭐⭐, 2.3 = ⭐⭐⭐
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return "";
  const stars = Math.ceil(rating);
  return `${rating} ${"⭐".repeat(stars)}`;
}
