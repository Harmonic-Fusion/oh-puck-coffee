/**
 * Flavor wheel data loaded from src/data/ JSON files
 * Also available via API at /api/assets/data/:id.json
 *
 * This file provides a single source of truth for all flavor wheel data.
 */
import flavorWheelJson from "../../data/flavor-wheel.json";
import bodySelectorJson from "../../data/body-selector.json";
import adjectivesIntensifiersJson from "../../data/adjectives-intensifiers.json";
import type {
  FlavorWheelData,
  FlavorNode,
  BodySelectorData,
  AdjectivesIntensifiersData,
} from "./types";

// Load flavor wheel data
export const FLAVOR_WHEEL_DATA: FlavorWheelData =
  flavorWheelJson as FlavorWheelData;

// Load body selector data
export const BODY_SELECTOR_DATA: BodySelectorData =
  bodySelectorJson as BodySelectorData;

// Load adjectives and intensifiers data
export const ADJECTIVES_INTENSIFIERS_DATA: AdjectivesIntensifiersData =
  adjectivesIntensifiersJson as AdjectivesIntensifiersData;

/**
 * Default color used when no match is found
 */
export const DEFAULT_COLOR = "rgba(158, 158, 158, 0.3)";

/**
 * Helper function to increase opacity of an rgba color string.
 * Useful for selected states to make colors more vibrant.
 */
export function increaseOpacity(color: string, newOpacity: number): string {
  const rgbaMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/
  );
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${newOpacity})`;
  }
  return color;
}

/**
 * Look up a flavor node's color by walking the FLAVOR_WHEEL_DATA tree.
 * `path` is an array of node names, e.g. ["Sweet", "Chocolate", "Dark Chocolate"].
 * Returns the node's embedded color, or DEFAULT_COLOR if not found.
 */
export function getFlavorColor(path: string[]): string {
  if (path.length === 0) return DEFAULT_COLOR;

  let nodes: FlavorNode[] = FLAVOR_WHEEL_DATA.children;
  let color: string = DEFAULT_COLOR;

  for (const segment of path) {
    const found = nodes.find(
      (n) => n.name.toLowerCase() === segment.toLowerCase()
    );
    if (!found) break;
    color = found.color;
    nodes = found.children ?? [];
  }

  return color;
}

/**
 * Look up a body descriptor's category color.
 * Walks BODY_SELECTOR_DATA to find which category contains the descriptor.
 */
export function getBodyColor(descriptor: string): string {
  const categories = ["light", "medium", "heavy"] as const;
  const lowerDescriptor = descriptor.toLowerCase();

  // Check if it's a category name itself
  for (const cat of categories) {
    if (cat === lowerDescriptor) {
      return BODY_SELECTOR_DATA[cat].color;
    }
  }

  // Search descriptors
  for (const cat of categories) {
    if (
      BODY_SELECTOR_DATA[cat].descriptors.some(
        (d) => d.toLowerCase() === lowerDescriptor
      )
    ) {
      return BODY_SELECTOR_DATA[cat].color;
    }
  }

  return BODY_SELECTOR_DATA.light.color;
}

/**
 * Look up an adjective's color by scanning rows in ADJECTIVES_INTENSIFIERS_DATA.
 */
export function getAdjectiveColor(adjective: string): string {
  const lowerAdj = adjective.toLowerCase();

  for (const row of ADJECTIVES_INTENSIFIERS_DATA.rows) {
    if (row.left.items.some((a) => a.toLowerCase() === lowerAdj)) {
      return row.left.color;
    }
    if (row.right.items.some((a) => a.toLowerCase() === lowerAdj)) {
      return row.right.color;
    }
  }

  return DEFAULT_COLOR;
}
