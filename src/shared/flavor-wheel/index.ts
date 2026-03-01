/**
 * Main entry point for flavor wheel module
 * Re-exports all public APIs
 */

export * from "./types";
export * from "./data";

// Re-export color functions for convenience
export {
  getFlavorColor,
  getBodyColor,
  getAdjectiveColor,
  getBitterColor,
  getSourColor,
} from "./data";
