/**
 * Color palette for flavor wheel components
 * Based on Counter Culture Coffee Taster's Flavor Wheel
 * 
 * Note: These are approximate values. For production, extract exact HEX values
 * from assets/coffee_flavor_wheel.jpg using a color picker tool.
 */

// Muted watercolor-like colors with opacity support
// Based on Counter Culture Coffee Taster's Flavor Wheel diagram
export const FLAVOR_WHEEL_COLORS = {
  fruity: {
    berry: "rgba(233, 30, 99, 0.25)", // Muted Pink/Red
    citrus: "rgba(255, 193, 7, 0.25)", // Muted Amber/Yellow
    stoneFruit: "rgba(255, 111, 0, 0.25)", // Muted Orange/Red
    tropical: "rgba(255, 179, 0, 0.25)", // Muted Amber/Yellow
    driedFruit: "rgba(106, 27, 154, 0.25)", // Muted Purple/Brown
    // Specific berry flavors (matching actual flavor names)
    berryFlavors: {
      Blackberry: "rgba(156, 39, 176, 0.25)", // Muted Dark Purple
      Raspberry: "rgba(233, 30, 99, 0.25)", // Muted Pink
      Blueberry: "rgba(63, 81, 181, 0.25)", // Muted Blue
      Strawberry: "rgba(244, 67, 54, 0.25)", // Muted Red
    },
    // Specific citrus flavors
    citrusFlavors: {
      Lemon: "rgba(255, 235, 59, 0.3)", // Muted Yellow
      Lime: "rgba(205, 220, 57, 0.3)", // Muted Light Green
      Orange: "rgba(255, 152, 0, 0.25)", // Muted Orange
      Grapefruit: "rgba(255, 138, 101, 0.25)", // Muted Pink-Orange
    },
    // Specific stone fruit flavors
    stoneFruitFlavors: {
      Peach: "rgba(255, 183, 77, 0.3)", // Muted Light Orange
      Cherry: "rgba(211, 47, 47, 0.25)", // Muted Red
      Plum: "rgba(142, 36, 170, 0.25)", // Muted Purple
      Apricot: "rgba(255, 167, 38, 0.3)", // Muted Orange
    },
    // Specific tropical flavors
    tropicalFlavors: {
      Pineapple: "rgba(255, 235, 59, 0.3)", // Muted Yellow
      Mango: "rgba(255, 152, 0, 0.25)", // Muted Orange
      Papaya: "rgba(255, 183, 77, 0.3)", // Muted Light Orange
      "Passion Fruit": "rgba(255, 111, 0, 0.25)", // Muted Orange
    },
    // Specific dried fruit flavors
    driedFruitFlavors: {
      Raisin: "rgba(121, 85, 72, 0.25)", // Muted Brown
      Prune: "rgba(74, 20, 140, 0.25)", // Muted Dark Purple
      Date: "rgba(141, 110, 99, 0.25)", // Muted Brown
      Fig: "rgba(93, 64, 55, 0.25)", // Muted Dark Brown
    },
  },
  floral: {
    base: "rgba(248, 187, 208, 0.3)", // Muted Light Pink
    flower: "rgba(248, 187, 208, 0.3)", // Muted Light Pink
    teaLike: "rgba(200, 230, 201, 0.3)", // Muted Light Green
    herbal: "rgba(197, 225, 165, 0.3)", // Muted Light Green
    // Specific flower flavors
    flowerFlavors: {
      Jasmine: "rgba(255, 245, 238, 0.35)", // Muted White/Cream
      Rose: "rgba(244, 143, 177, 0.25)", // Muted Pink
      Chamomile: "rgba(255, 245, 238, 0.35)", // Muted Cream
      Hibiscus: "rgba(233, 30, 99, 0.25)", // Muted Pink
    },
    // Specific tea-like flavors
    teaLikeFlavors: {
      "Black Tea": "rgba(121, 85, 72, 0.25)", // Muted Brown
      "Green Tea": "rgba(129, 199, 132, 0.3)", // Muted Green
      "Earl Grey": "rgba(186, 104, 200, 0.25)", // Muted Purple
      Oolong: "rgba(161, 136, 127, 0.25)", // Muted Brown
    },
    // Specific herbal flavors
    herbalFlavors: {
      Lavender: "rgba(186, 104, 200, 0.25)", // Muted Purple
      Mint: "rgba(129, 199, 132, 0.3)", // Muted Green
      Eucalyptus: "rgba(129, 199, 132, 0.3)", // Muted Green
      Lemongrass: "rgba(205, 220, 57, 0.3)", // Muted Light Green
    },
  },
  sweet: {
    chocolate: "rgba(93, 64, 55, 0.25)", // Muted Brown
    caramel: "rgba(255, 183, 77, 0.3)", // Muted Light Orange
    honey: "rgba(255, 193, 7, 0.3)", // Muted Amber
    vanilla: "rgba(255, 249, 196, 0.35)", // Muted Light Yellow
    // Specific chocolate flavors
    chocolateFlavors: {
      "Dark Chocolate": "rgba(62, 39, 35, 0.25)", // Muted Very Dark Brown
      "Milk Chocolate": "rgba(121, 85, 72, 0.25)", // Muted Brown
      Cocoa: "rgba(93, 64, 55, 0.25)", // Muted Brown
      Bittersweet: "rgba(78, 52, 46, 0.25)", // Muted Dark Brown
    },
    // Specific caramel flavors
    caramelFlavors: {
      Caramelized: "rgba(255, 183, 77, 0.3)", // Muted Light Orange
      Butterscotch: "rgba(255, 224, 130, 0.3)", // Muted Yellow
      Toffee: "rgba(141, 110, 99, 0.25)", // Muted Brown
      "Brown Sugar": "rgba(141, 110, 99, 0.25)", // Muted Brown
    },
    // Specific honey flavors
    honeyFlavors: {
      Honey: "rgba(255, 235, 59, 0.3)", // Muted Yellow
      "Maple Syrup": "rgba(141, 110, 99, 0.25)", // Muted Brown
      Molasses: "rgba(78, 52, 46, 0.25)", // Muted Dark Brown
      Agave: "rgba(255, 235, 59, 0.3)", // Muted Yellow
    },
    // Specific vanilla flavors
    vanillaFlavors: {
      Vanilla: "rgba(255, 249, 196, 0.35)", // Muted Light Yellow
      Cream: "rgba(255, 255, 255, 0.4)", // Muted White
      Butter: "rgba(255, 235, 59, 0.3)", // Muted Yellow
      Custard: "rgba(255, 245, 238, 0.35)", // Muted Cream
    },
  },
  spicy: {
    warmSpice: "rgba(255, 152, 0, 0.25)", // Muted Orange
    pungent: "rgba(255, 111, 0, 0.25)", // Muted Orange
    nut: "rgba(215, 204, 200, 0.3)", // Muted Light Brown
    roasted: "rgba(93, 64, 55, 0.25)", // Muted Brown
    // Specific warm spice flavors
    warmSpiceFlavors: {
      Cinnamon: "rgba(141, 110, 99, 0.25)", // Muted Brown
      Nutmeg: "rgba(121, 85, 72, 0.25)", // Muted Brown
      Clove: "rgba(93, 64, 55, 0.25)", // Muted Brown
      Cardamom: "rgba(129, 199, 132, 0.3)", // Muted Green
    },
    // Specific pungent flavors
    pungentFlavors: {
      "Black Pepper": "rgba(66, 66, 66, 0.3)", // Muted Dark Gray
      Ginger: "rgba(255, 152, 0, 0.25)", // Muted Orange
      Anise: "rgba(66, 66, 66, 0.3)", // Muted Dark Gray
      "Star Anise": "rgba(66, 66, 66, 0.3)", // Muted Dark Gray
    },
    // Specific nut flavors
    nutFlavors: {
      Almond: "rgba(224, 224, 224, 0.3)", // Muted Light Gray
      Hazelnut: "rgba(161, 136, 127, 0.25)", // Muted Brown
      Walnut: "rgba(121, 85, 72, 0.25)", // Muted Brown
      Peanut: "rgba(188, 170, 164, 0.3)", // Muted Tan
    },
    // Specific roasted flavors
    roastedFlavors: {
      Toast: "rgba(141, 110, 99, 0.25)", // Muted Brown
      "Roasted Grain": "rgba(121, 85, 72, 0.25)", // Muted Brown
      Malt: "rgba(141, 110, 99, 0.25)", // Muted Brown
      Cereal: "rgba(188, 170, 164, 0.3)", // Muted Tan
    },
  },
  earthy: {
    soil: "rgba(85, 139, 47, 0.25)", // Muted Green
    wood: "rgba(104, 159, 56, 0.25)", // Muted Green
    tobacco: "rgba(93, 64, 55, 0.25)", // Muted Brown
    vegetal: "rgba(139, 195, 74, 0.3)", // Muted Light Green
    // Specific soil flavors
    soilFlavors: {
      Earthy: "rgba(85, 139, 47, 0.25)", // Muted Green
      "Wet Soil": "rgba(69, 90, 100, 0.25)", // Muted Dark Green
      Mineral: "rgba(158, 158, 158, 0.3)", // Muted Gray
      Dusty: "rgba(189, 189, 189, 0.3)", // Muted Light Gray
    },
    // Specific wood flavors
    woodFlavors: {
      Cedar: "rgba(121, 85, 72, 0.25)", // Muted Brown
      Oak: "rgba(141, 110, 99, 0.25)", // Muted Brown
      Pine: "rgba(129, 199, 132, 0.3)", // Muted Green
      Resinous: "rgba(93, 64, 55, 0.25)", // Muted Brown
    },
    // Specific tobacco flavors
    tobaccoFlavors: {
      Tobacco: "rgba(93, 64, 55, 0.25)", // Muted Brown
      Leather: "rgba(121, 85, 72, 0.25)", // Muted Brown
      Smoky: "rgba(66, 66, 66, 0.3)", // Muted Dark Gray
      "Pipe Tobacco": "rgba(93, 64, 55, 0.25)", // Muted Brown
    },
    // Specific vegetal flavors
    vegetalFlavors: {
      Grassy: "rgba(129, 199, 132, 0.3)", // Muted Green
      Green: "rgba(139, 195, 74, 0.3)", // Muted Light Green
      Hay: "rgba(255, 235, 59, 0.3)", // Muted Yellow
      Fresh: "rgba(197, 225, 165, 0.3)", // Muted Light Green
    },
  },
} as const;

export const BODY_COLORS = {
  light: "rgba(224, 224, 224, 0.4)", // Muted Light Gray
  medium: "rgba(158, 158, 158, 0.4)", // Muted Gray
  heavy: "rgba(66, 66, 66, 0.4)", // Muted Dark Gray
} as const;

export const ADJECTIVES_COLORS = {
  row1: {
    left: "rgba(129, 212, 250, 0.3)", // Muted Light Blue
    right: "rgba(224, 224, 224, 0.4)", // Muted Light Gray
  },
  row2: {
    left: "rgba(206, 147, 216, 0.3)", // Muted Light Purple
    right: "rgba(165, 214, 167, 0.3)", // Muted Light Green
  },
  row3: {
    left: "rgba(123, 31, 162, 0.25)", // Muted Dark Purple
    right: "rgba(248, 187, 208, 0.3)", // Muted Light Pink
  },
  row4: {
    left: "rgba(255, 183, 77, 0.3)", // Muted Light Orange
    right: "rgba(215, 204, 200, 0.3)", // Muted Light Brown
  },
  row5: {
    left: "rgba(66, 66, 66, 0.3)", // Muted Dark Gray
    right: "rgba(129, 212, 250, 0.3)", // Muted Light Blue
  },
} as const;

/**
 * Helper function to get color for a flavor path
 * Returns a color based on the category, subcategory, and specific flavor
 * Supports three levels of depth for more color variation
 */
export function getFlavorColor(path: string[]): string {
  if (path.length === 0) return "rgba(158, 158, 158, 0.3)"; // Default muted gray

  const category = path[0];
  // Path is now just an array of node names, no colon-separated strings
  const subcategory = path.length > 1 ? path[1] : undefined;
  const specificFlavor = path.length > 2 ? path[path.length - 1] : undefined;

  // Helper to get flavor color with fallback
  const getFlavorColorByKey = (
    flavors: Record<string, string>,
    key: string,
    fallback: string
  ): string => {
    // Try exact match first
    if (flavors[key as keyof typeof flavors]) {
      return flavors[key as keyof typeof flavors];
    }
    
    // Try case-insensitive match
    const lowerKey = key.toLowerCase();
    for (const [flavorKey, color] of Object.entries(flavors)) {
      if (flavorKey.toLowerCase() === lowerKey) {
        return color;
      }
    }
    
    return fallback;
  };

  switch (category) {
    case "Fruity":
      if (subcategory === "Berry") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.fruity.berryFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.fruity.berry
          );
        }
        return FLAVOR_WHEEL_COLORS.fruity.berry;
      }
      if (subcategory === "Citrus") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.fruity.citrusFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.fruity.citrus
          );
        }
        return FLAVOR_WHEEL_COLORS.fruity.citrus;
      }
      if (subcategory === "Stone Fruit") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.fruity.stoneFruitFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.fruity.stoneFruit
          );
        }
        return FLAVOR_WHEEL_COLORS.fruity.stoneFruit;
      }
      if (subcategory === "Tropical") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.fruity.tropicalFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.fruity.tropical
          );
        }
        return FLAVOR_WHEEL_COLORS.fruity.tropical;
      }
      if (subcategory === "Dried Fruit") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.fruity.driedFruitFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.fruity.driedFruit
          );
        }
        return FLAVOR_WHEEL_COLORS.fruity.driedFruit;
      }
      return FLAVOR_WHEEL_COLORS.fruity.berry; // Default fruity color

    case "Floral":
      if (subcategory === "Flower") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.floral.flowerFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.floral.flower
          );
        }
        return FLAVOR_WHEEL_COLORS.floral.flower;
      }
      if (subcategory === "Tea-like") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.floral.teaLikeFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.floral.teaLike
          );
        }
        return FLAVOR_WHEEL_COLORS.floral.teaLike;
      }
      if (subcategory === "Herbal") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.floral.herbalFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.floral.herbal
          );
        }
        return FLAVOR_WHEEL_COLORS.floral.herbal;
      }
      return FLAVOR_WHEEL_COLORS.floral.base;

    case "Sweet":
      if (subcategory === "Chocolate") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.sweet.chocolateFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.sweet.chocolate
          );
        }
        return FLAVOR_WHEEL_COLORS.sweet.chocolate;
      }
      if (subcategory === "Caramel") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.sweet.caramelFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.sweet.caramel
          );
        }
        return FLAVOR_WHEEL_COLORS.sweet.caramel;
      }
      if (subcategory === "Honey") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.sweet.honeyFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.sweet.honey
          );
        }
        return FLAVOR_WHEEL_COLORS.sweet.honey;
      }
      if (subcategory === "Vanilla") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.sweet.vanillaFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.sweet.vanilla
          );
        }
        return FLAVOR_WHEEL_COLORS.sweet.vanilla;
      }
      return FLAVOR_WHEEL_COLORS.sweet.caramel; // Default sweet color

    case "Spicy":
      if (subcategory === "Warm Spice") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.spicy.warmSpiceFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.spicy.warmSpice
          );
        }
        return FLAVOR_WHEEL_COLORS.spicy.warmSpice;
      }
      if (subcategory === "Pungent") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.spicy.pungentFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.spicy.pungent
          );
        }
        return FLAVOR_WHEEL_COLORS.spicy.pungent;
      }
      if (subcategory === "Nut") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.spicy.nutFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.spicy.nut
          );
        }
        return FLAVOR_WHEEL_COLORS.spicy.nut;
      }
      if (subcategory === "Roasted") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.spicy.roastedFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.spicy.roasted
          );
        }
        return FLAVOR_WHEEL_COLORS.spicy.roasted;
      }
      return FLAVOR_WHEEL_COLORS.spicy.warmSpice; // Default spicy color

    case "Earthy":
      if (subcategory === "Soil") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.earthy.soilFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.earthy.soil
          );
        }
        return FLAVOR_WHEEL_COLORS.earthy.soil;
      }
      if (subcategory === "Wood") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.earthy.woodFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.earthy.wood
          );
        }
        return FLAVOR_WHEEL_COLORS.earthy.wood;
      }
      if (subcategory === "Tobacco") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.earthy.tobaccoFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.earthy.tobacco
          );
        }
        return FLAVOR_WHEEL_COLORS.earthy.tobacco;
      }
      if (subcategory === "Vegetal") {
        if (specificFlavor) {
          return getFlavorColorByKey(
            FLAVOR_WHEEL_COLORS.earthy.vegetalFlavors,
            specificFlavor,
            FLAVOR_WHEEL_COLORS.earthy.vegetal
          );
        }
        return FLAVOR_WHEEL_COLORS.earthy.vegetal;
      }
      return FLAVOR_WHEEL_COLORS.earthy.soil; // Default earthy color

    default:
      return "rgba(158, 158, 158, 0.3)"; // Default muted gray
  }
}

/**
 * Helper function to get color for body category
 */
export function getBodyColor(category: "light" | "medium" | "heavy"): string {
  return BODY_COLORS[category];
}

/**
 * Helper function to get color for adjectives row
 */
export function getAdjectiveColor(
  rowIndex: number,
  side: "left" | "right"
): string {
  const rowKey = `row${rowIndex + 1}` as keyof typeof ADJECTIVES_COLORS;
  const row = ADJECTIVES_COLORS[rowKey];
  return row[side];
}

/**
 * Helper function to increase opacity of an rgba color string
 * Useful for selected states to make colors more vibrant
 */
export function increaseOpacity(color: string, newOpacity: number): string {
  // Match rgba(r, g, b, opacity) pattern
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d\.]+)\)/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${newOpacity})`;
  }
  // If not rgba format, return as-is
  return color;
}
