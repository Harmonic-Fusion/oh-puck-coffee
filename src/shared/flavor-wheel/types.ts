/**
 * TypeScript types for nested flavor wheel structure
 */

export interface FlavorNode {
  name: string;
  children?: FlavorNode[];
}

export interface FlavorWheelData {
  name: string;
  children: FlavorNode[];
}

/**
 * Body selector structure
 */
export interface BodySelectorData {
  light: string[];
  medium: string[];
  heavy: string[];
}

/**
 * Adjectives and intensifiers structure
 */
export interface AdjectivesRow {
  left: string[];
  right: string[];
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
