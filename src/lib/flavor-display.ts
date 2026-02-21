/**
 * Helper functions for displaying flavor wheel data
 */

/**
 * Extract the most specific (leaf) flavor from a path array
 * Now paths are just node names, so return as-is (kept for backward compatibility)
 */
export function getLeafFlavor(path: string): string {
  // If it contains ":", it's old format - extract last part
  if (path.includes(":")) {
    const parts = path.split(":");
    return parts[parts.length - 1] || path;
  }
  // New format: just return the node name
  return path;
}

/**
 * Format flavor paths for display
 * Returns the most specific flavor name from each path
 */
export function formatFlavorPaths(paths: string[]): string[] {
  return paths.map(getLeafFlavor);
}

/**
 * Format body path for display
 * Handles both old string format and new string[] format
 */
export function formatBodyDisplay(body: string | string[] | null | undefined): string | null {
  if (!body) return null;
  if (typeof body === "string") return body; // Backward compatibility
  if (Array.isArray(body) && body.length > 0) {
    // Return the last item (most recently selected)
    return body[body.length - 1];
  }
  return null;
}

/**
 * Get all unique leaf flavors from flavorWheelCategories
 */
export function getAllLeafFlavors(
  categories: Record<string, string[]> | null | undefined
): string[] {
  if (!categories) return [];
  const allFlavors = new Set<string>();
  for (const paths of Object.values(categories)) {
    for (const path of paths) {
      allFlavors.add(getLeafFlavor(path));
    }
  }
  return Array.from(allFlavors);
}
