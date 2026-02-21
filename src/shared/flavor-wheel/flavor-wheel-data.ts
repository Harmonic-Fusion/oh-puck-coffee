/**
 * Flavor wheel data from untracked_wheel_revised.json
 */
import type { FlavorWheelData, FlavorNode } from "./types";

/**
 * Recursively removes children where the child name equals the parent name
 */
function removeDuplicateChildren(node: FlavorNode): FlavorNode {
  const cleaned: FlavorNode = {
    name: node.name,
  };

  if (node.children) {
    cleaned.children = node.children
      .filter((child) => child.name !== node.name)
      .map((child) => removeDuplicateChildren(child));
  }

  return cleaned;
}

const RAW_FLAVOR_WHEEL_DATA: FlavorWheelData = {
  name: "Coffee",
  children: [
    {
      name: "Fruity",
      children: [
        {
          name: "Berry",
          children: [
            { name: "Blackberry" },
            { name: "Raspberry" },
            { name: "Blueberry" },
            { name: "Strawberry" },
          ],
        },
        {
          name: "Citrus",
          children: [
            { name: "Lemon" },
            { name: "Lime" },
            { name: "Orange" },
            { name: "Grapefruit" },
          ],
        },
        {
          name: "Stone Fruit",
          children: [
            { name: "Peach" },
            { name: "Cherry" },
            { name: "Plum" },
            { name: "Apricot" },
          ],
        },
        {
          name: "Tropical",
          children: [
            { name: "Pineapple" },
            { name: "Mango" },
            { name: "Papaya" },
            { name: "Passion Fruit" },
          ],
        },
        {
          name: "Dried Fruit",
          children: [
            { name: "Raisin" },
            { name: "Prune" },
            { name: "Date" },
            { name: "Fig" },
          ],
        },
      ],
    },
    {
      name: "Floral",
      children: [
        {
          name: "Flower",
          children: [
            { name: "Jasmine" },
            { name: "Rose" },
            { name: "Chamomile" },
            { name: "Hibiscus" },
          ],
        },
        {
          name: "Tea-like",
          children: [
            { name: "Black Tea" },
            { name: "Green Tea" },
            { name: "Earl Grey" },
            { name: "Oolong" },
          ],
        },
        {
          name: "Herbal",
          children: [
            { name: "Lavender" },
            { name: "Mint" },
            { name: "Eucalyptus" },
            { name: "Lemongrass" },
          ],
        },
      ],
    },
    {
      name: "Sweet",
      children: [
        {
          name: "Chocolate",
          children: [
            { name: "Dark Chocolate" },
            { name: "Milk Chocolate" },
            { name: "Cocoa" },
            { name: "Bittersweet" },
          ],
        },
        {
          name: "Caramel",
          children: [
            { name: "Caramelized" },
            { name: "Butterscotch" },
            { name: "Toffee" },
            { name: "Brown Sugar" },
          ],
        },
        {
          name: "Honey",
          children: [
            { name: "Maple Syrup" },
            { name: "Molasses" },
            { name: "Agave" },
          ],
        },
        {
          name: "Vanilla",
          children: [
            { name: "Cream" },
            { name: "Butter" },
            { name: "Custard" },
          ],
        },
      ],
    },
    {
      name: "Spicy",
      children: [
        {
          name: "Warm Spice",
          children: [
            { name: "Cinnamon" },
            { name: "Nutmeg" },
            { name: "Clove" },
            { name: "Cardamom" },
          ],
        },
        {
          name: "Pungent",
          children: [
            { name: "Black Pepper" },
            { name: "Ginger" },
            { name: "Anise" },
            { name: "Star Anise" },
          ],
        },
        {
          name: "Nut",
          children: [
            { name: "Almond" },
            { name: "Hazelnut" },
            { name: "Walnut" },
            { name: "Peanut" },
          ],
        },
        {
          name: "Roasted",
          children: [
            { name: "Toast" },
            { name: "Roasted Grain" },
            { name: "Malt" },
            { name: "Cereal" },
          ],
        },
      ],
    },
    {
      name: "Earthy",
      children: [
        {
          name: "Soil",
          children: [
            { name: "Wet Soil" },
            { name: "Mineral" },
            { name: "Dusty" },
          ],
        },
        {
          name: "Wood",
          children: [
            { name: "Cedar" },
            { name: "Oak" },
            { name: "Pine" },
            { name: "Resinous" },
          ],
        },
        {
          name: "Tobacco",
          children: [
            { name: "Leather" },
            { name: "Smoky" },
            { name: "Pipe Tobacco" },
          ],
        },
        {
          name: "Vegetal",
          children: [
            { name: "Grassy" },
            { name: "Green" },
            { name: "Hay" },
            { name: "Fresh" },
          ],
        },
      ],
    },
  ],
};

// Apply cleaning function to remove duplicate children
export const FLAVOR_WHEEL_DATA: FlavorWheelData = {
  name: RAW_FLAVOR_WHEEL_DATA.name,
  children: RAW_FLAVOR_WHEEL_DATA.children.map((child) =>
    removeDuplicateChildren(child)
  ),
};
