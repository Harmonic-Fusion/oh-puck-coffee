export const FLAVOR_WHEEL = {
  Fruity: {
    Berry: ["Blackberry", "Raspberry", "Blueberry", "Strawberry"],
    "Dried Fruit": ["Raisin", "Prune"],
    "Other Fruit": ["Coconut", "Cherry", "Pomegranate", "Pineapple", "Grape", "Apple", "Peach", "Pear"],
    Citrus: ["Grapefruit", "Orange", "Lemon", "Lime"],
  },
  "Sour/Fermented": {
    Sour: ["Sour Aromatics", "Acetic Acid", "Butyric Acid", "Isovaleric Acid", "Citric Acid", "Malic Acid"],
    "Alcohol/Fermented": ["Winey", "Whiskey", "Fermented", "Overripe"],
  },
  "Green/Vegetative": {
    "Olive Oil": ["Olive Oil"],
    Raw: ["Raw", "Green/Vegetative", "Bean-like"],
    "Green/Vegetative": ["Under-ripe", "Peapod", "Fresh", "Dark Green", "Vegetative", "Hay-like", "Herb-like"],
  },
  Other: {
    "Papery/Musty": ["Stale", "Cardboard", "Papery", "Woody", "Moldy/Damp", "Musty/Dusty", "Musty/Earthy", "Animalic", "Meaty/Brothy", "Phenolic"],
    Chemical: ["Bitter", "Salty", "Medicinal", "Petroleum", "Skunky", "Rubber"],
  },
  Roasted: {
    "Pipe Tobacco": ["Pipe Tobacco"],
    Tobacco: ["Tobacco"],
    "Burnt": ["Acrid", "Ashy", "Smoky", "Brown Roast"],
    Cereal: ["Grain", "Malt"],
  },
  Spices: {
    "Pungent": ["Pungent"],
    Pepper: ["Pepper"],
    "Brown Spice": ["Anise", "Nutmeg", "Cinnamon", "Clove"],
  },
  "Nutty/Cocoa": {
    "Nutty": ["Peanuts", "Hazelnut", "Almond"],
    "Cocoa": ["Cocoa", "Chocolate", "Dark Chocolate"],
  },
  Sweet: {
    "Brown Sugar": ["Molasses", "Maple Syrup", "Caramelized", "Honey"],
    Vanilla: ["Vanilla", "Vanillin"],
    "Overall Sweet": ["Overall Sweet", "Sweet Aromatics"],
  },
  Floral: {
    "Black Tea": ["Black Tea"],
    Floral: ["Chamomile", "Rose", "Jasmine"],
  },
} as const;

export type FlavorWheelCategory = keyof typeof FLAVOR_WHEEL;

export const BODY_ADJECTIVES = [
  "Juicy",
  "Silky",
  "Smooth",
  "Creamy",
  "Round",
  "Syrupy",
  "Tea-like",
  "Thin",
  "Watery",
  "Astringent",
  "Dry",
  "Heavy",
] as const;

export type BodyAdjective = (typeof BODY_ADJECTIVES)[number];

export const EXTRA_ADJECTIVES = [
  "Bright",
  "Clean",
  "Complex",
  "Delicate",
  "Elegant",
  "Lively",
  "Mellow",
  "Rich",
  "Vibrant",
  "Wild",
  "Balanced",
  "Lingering",
] as const;

export type ExtraAdjective = (typeof EXTRA_ADJECTIVES)[number];
