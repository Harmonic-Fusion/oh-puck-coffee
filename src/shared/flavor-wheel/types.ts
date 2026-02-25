/**
 * TypeScript types for nested flavor wheel structure
 */

/**
 * Color info embedded in data nodes
 */
export interface FlavorColor {
  color: string; // e.g. "rgba(233, 30, 99, 0.25)"
  colorName: string; // e.g. "Muted Pink/Red"
}

export interface FlavorNode extends FlavorColor {
  name: string;
  children?: FlavorNode[];
}

export interface FlavorWheelData extends FlavorColor {
  name: string;
  children: FlavorNode[];
}

/**
 * Body selector structure
 */
export interface BodyCategoryData extends FlavorColor {
  descriptors: string[];
}

export interface BodySelectorData {
  light: BodyCategoryData;
  medium: BodyCategoryData;
  heavy: BodyCategoryData;
}

/**
 * Adjectives and intensifiers structure
 */
export interface AdjectivesSide extends FlavorColor {
  items: string[];
}

export interface AdjectivesRow {
  left: AdjectivesSide;
  right: AdjectivesSide;
}

export interface AdjectivesIntensifiersData {
  rows: AdjectivesRow[];
}

/**
 * Full path representation for selections
 * Example: ["Sweet", "Sweet:Chocolate", "Sweet:Chocolate:Dark Chocolate"]
 */
export type FlavorPath = string[];

/**
 * Body path representation
 * Example: ["Light", "Light:Watery"]
 */
export type BodyPath = string[];
