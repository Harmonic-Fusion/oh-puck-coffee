"use client";

import { useState, useMemo, useEffect } from "react";
import { NestedFlavorWheel } from "@/components/flavor-wheel/NestedFlavorWheel";
import { NestedBodySelector } from "@/components/flavor-wheel/NestedBodySelector";
import { AdjectivesIntensifiersSelector } from "@/components/flavor-wheel/AdjectivesIntensifiersSelector";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import { FLAVOR_WHEEL_DATA, BODY_SELECTOR_DATA } from "@/shared/flavor-wheel";
import { ADJECTIVES_INTENSIFIERS_DATA } from "@/shared/flavor-wheel";
import { getFlavorColor, getBodyColor, getAdjectiveColor } from "@/shared/flavor-wheel/colors";
import type { FlavorNode } from "@/shared/flavor-wheel/types";

export default function FlavorSelectorPage() {
  const [flavorCategories, setFlavorCategories] = useState<string[]>([]);
  const [body, setBody] = useState<string[]>([]);
  const [adjectives, setAdjectives] = useState<string[]>([]);

  // Helper function to build node path
  function buildNodePath(node: FlavorNode, parentPath: string[]): string[] {
    return [...parentPath, node.name];
  }

  // Helper function to collect selected nodes
  function collectSelectedNodes(
    node: FlavorNode,
    nodePath: string[],
    selectedNodes: Set<string>,
    result: Array<{ name: string; path: string[] }>
  ): void {
    const currentNodePath = buildNodePath(node, nodePath);
    const currentNodeKey = currentNodePath.join(":");

    if (selectedNodes.has(currentNodeKey)) {
      result.push({
        name: node.name,
        path: currentNodePath,
      });
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        collectSelectedNodes(child, currentNodePath, selectedNodes, result);
      }
    }
  }

  // Track custom order for flavors (set when user reorders)
  const [flavorOrder, setFlavorOrder] = useState<string[] | null>(null);

  // Helper function to find the full path (ancestors + node) for a given node name
  function findNodePath(nodeName: string): string[] | null {
    function searchNode(node: FlavorNode, path: string[] = []): string[] | null {
      const currentPath = [...path, node.name];
      
      if (node.name === nodeName) {
        return currentPath;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = searchNode(child, currentPath);
          if (result) return result;
        }
      }
      
      return null;
    }
    
    for (const category of FLAVOR_WHEEL_DATA.children) {
      const result = searchNode(category);
      if (result) return result;
    }
    
    return null;
  }

  // Wrapper for setFlavorCategories that appends new items (ancestors first, then leaf) to the end
  function handleFlavorCategoriesChange(newValue: string[]) {
    const currentSet = new Set(flavorCategories);
    const newSet = new Set(newValue);
    
    // Find items that are new (in newValue but not in current)
    const newItems = newValue.filter((name) => !currentSet.has(name));
    
    if (newItems.length === 0) {
      // No new items, just update (could be removal or reordering from component)
      setFlavorCategories(newValue);
      return;
    }
    
    // Collect all paths for new items and build a map of node to depth
    const nodeToDepth = new Map<string, number>();
    const allPaths: string[][] = [];
    const newItemSet = new Set(newItems);
    
    for (const newNodeName of newItems) {
      const fullPath = findNodePath(newNodeName);
      if (fullPath) {
        // Only include nodes that are actually new (in newItemSet)
        const relevantPath = fullPath.filter((node) => newItemSet.has(node));
        if (relevantPath.length > 0) {
          allPaths.push(relevantPath);
          // Record depth for each node (position in path)
          relevantPath.forEach((node, index) => {
            const currentDepth = nodeToDepth.get(node);
            if (currentDepth === undefined || index < currentDepth) {
              nodeToDepth.set(node, index);
            }
          });
        }
      } else {
        // Fallback: if path not found, just add the node at depth 0
        allPaths.push([newNodeName]);
        nodeToDepth.set(newNodeName, 0);
      }
    }
    
    // Sort new items by depth (ancestors first), then by order in their paths
    const itemsToAppend = newItems
      .filter((name) => nodeToDepth.has(name))
      .sort((a, b) => {
        const depthA = nodeToDepth.get(a) ?? Infinity;
        const depthB = nodeToDepth.get(b) ?? Infinity;
        if (depthA !== depthB) {
          return depthA - depthB;
        }
        // Same depth: maintain order from first path that contains both
        for (const path of allPaths) {
          const indexA = path.indexOf(a);
          const indexB = path.indexOf(b);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
        }
        return 0;
      });
    
    // Preserve existing order, append new items at the end
    const existingItems = flavorCategories.filter((name) => newSet.has(name));
    const updatedCategories = [...existingItems, ...itemsToAppend];
    
    setFlavorCategories(updatedCategories);
    
    // Update custom order if it exists
    if (flavorOrder) {
      const filteredOrder = flavorOrder.filter((name) => newSet.has(name));
      setFlavorOrder([...filteredOrder, ...itemsToAppend]);
    }
  }

  // Update custom order when flavorCategories changes (for removals)
  useEffect(() => {
    if (flavorOrder) {
      // Remove items that are no longer in flavorCategories
      const filteredOrder = flavorOrder.filter((name) =>
        flavorCategories.includes(name)
      );
      if (filteredOrder.length !== flavorOrder.length) {
        setFlavorOrder(filteredOrder);
      }
    }
  }, [flavorCategories, flavorOrder]);

  // Compute selected flavor words for badges
  const selectedFlavorWords = useMemo(() => {
    if (!Array.isArray(flavorCategories) || flavorCategories.length === 0) {
      return [];
    }

    const flavorsMap = new Map<string, { name: string; path: string[] }>();
    
    // For each selected node name, find it in the tree to get the full path for display/color
    const findNodeByName = (nodeName: string, category: FlavorNode, path: string[] = []): void => {
      const currentPath = [...path, category.name];
      
      if (category.name === nodeName) {
        // Store in map to avoid duplicates, keeping the first match
        if (!flavorsMap.has(nodeName)) {
          flavorsMap.set(nodeName, {
            name: nodeName,
            path: currentPath,
          });
        }
      }
      
      if (category.children) {
        for (const child of category.children) {
          findNodeByName(nodeName, child, currentPath);
        }
      }
    };
    
    // Use custom order if set, otherwise use flavorCategories order
    const orderToUse = flavorOrder || flavorCategories;
    
    // Process nodes in order, only finding each once
    for (const nodeName of orderToUse) {
      // Only process if it's still in flavorCategories (in case items were removed)
      if (flavorCategories.includes(nodeName) && !flavorsMap.has(nodeName)) {
        for (const category of FLAVOR_WHEEL_DATA.children) {
          findNodeByName(nodeName, category);
        }
      }
    }

    // Build result array preserving the order from orderToUse
    const orderedFlavors: Array<{ name: string; path: string[] }> = [];
    for (const nodeName of orderToUse) {
      const flavor = flavorsMap.get(nodeName);
      if (flavor) {
        orderedFlavors.push(flavor);
      }
    }

    // Always preserve the order from flavorCategories (or flavorOrder if set)
    // This respects the selection order (ancestors first, then leaf, appended to end)
    return orderedFlavors;
  }, [flavorCategories, flavorOrder]);

  // Compute body badge data
  const bodyBadgeData = useMemo(() => {
    if (body.length === 0) return null;
    const selectedName = body[0];
    // Check if it's a category name
    const isCategory = ["light", "medium", "heavy"].includes(selectedName.toLowerCase());
    const categoryForColor = isCategory
      ? (selectedName.toLowerCase() as "light" | "medium" | "heavy")
      : (() => {
          // Find which category this descriptor belongs to
          for (const [cat, descriptors] of Object.entries(BODY_SELECTOR_DATA)) {
            if (descriptors.some((d: string) => d.toLowerCase() === selectedName.toLowerCase())) {
              return cat.toLowerCase() as "light" | "medium" | "heavy";
            }
          }
          return "light" as const;
        })();

    return {
      label: selectedName,
      color: getBodyColor(categoryForColor),
      key: selectedName,
      className: "capitalize",
    };
  }, [body]);

  // Compute adjectives badge data
  const adjectivesBadgeData = useMemo(() => {
    return adjectives.map((adjective) => {
      let color = "rgba(158, 158, 158, 0.3)";
      for (let rowIndex = 0; rowIndex < ADJECTIVES_INTENSIFIERS_DATA.rows.length; rowIndex++) {
        const row = ADJECTIVES_INTENSIFIERS_DATA.rows[rowIndex];
        if (row.left.some((adj) => adj.toLowerCase() === adjective.toLowerCase())) {
          color = getAdjectiveColor(rowIndex, "left");
          break;
        }
        if (row.right.some((adj) => adj.toLowerCase() === adjective.toLowerCase())) {
          color = getAdjectiveColor(rowIndex, "right");
          break;
        }
      }

      return {
        label: adjective,
        color,
        key: adjective,
      };
    });
  }, [adjectives]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
          Flavor Selector Demo
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Interactive demo of the nested flavors, body selector, and
          adjectives/intensifiers components.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Selectors Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <NestedFlavorWheel
              value={flavorCategories}
              onChange={handleFlavorCategoriesChange}
            />
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <NestedBodySelector value={body} onChange={setBody} />
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <AdjectivesIntensifiersSelector
              value={adjectives}
              onChange={setAdjectives}
            />
          </div>
        </div>

        {/* Output/Resolution Column */}
        <div className="space-y-6">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
              <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-stone-100">
                Output / Resolution
              </h2>

              {/* Selected Flavors Badges */}
              <div className="mb-6">
                <SelectedBadges
                  title="Flavors"
                  items={selectedFlavorWords.map((flavor) => ({
                    label: flavor.name,
                    color: getFlavorColor(flavor.path),
                    key: flavor.name,
                  }))}
                  onClear={() => {
                    setFlavorCategories([]);
                    setFlavorOrder(null);
                  }}
                  onReorder={(reorderedItems) => {
                    // Map reordered badge items back to flavor names
                    const reorderedNames = reorderedItems.map((item) => item.key || item.label);
                    // Update the custom order
                    setFlavorOrder(reorderedNames);
                    // Also update flavorCategories to match the new order
                    // Filter to only include names that are still in flavorCategories
                    const orderedCategories = reorderedNames.filter((name) =>
                      flavorCategories.includes(name)
                    );
                    // Add any items that weren't in the reordered list (shouldn't happen, but safety check)
                    const remaining = flavorCategories.filter(
                      (name) => !reorderedNames.includes(name)
                    );
                    setFlavorCategories([...orderedCategories, ...remaining]);
                  }}
                />
              </div>

              {/* Selected Body Badge */}
              {bodyBadgeData && (
                <div className="mb-6">
                  <SelectedBadges
                    title="Body / Texture"
                    items={[bodyBadgeData]}
                    onClear={() => setBody([])}
                  />
                </div>
              )}

              {/* Selected Adjectives Badges */}
              {adjectivesBadgeData.length > 0 && (
                <div className="mb-6">
                  <SelectedBadges
                    title="Adjectives & Intensifiers"
                    items={adjectivesBadgeData}
                    onClear={() => setAdjectives([])}
                    onReorder={(reorderedItems) => {
                      // Map reordered badge items back to adjective names
                      const reorderedNames = reorderedItems.map((item) => item.key || item.label);
                      setAdjectives(reorderedNames);
                    }}
                  />
                </div>
              )}

              {/* JSON Output */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  JSON Output
                </h3>
                <pre className="max-h-96 overflow-auto rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs dark:border-stone-700 dark:bg-stone-800">
                  {JSON.stringify(
                    {
                      flavors: flavorCategories,
                      bodyTexture: body,
                      adjectives: adjectives,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
              <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
                Statistics
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Total flavor paths:
                  </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {flavorCategories.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Unique categories:
                  </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {new Set(flavorCategories.map(f => {
                      // Find which category this flavor belongs to
                      for (const category of FLAVOR_WHEEL_DATA.children) {
                        const findInCategory = (node: FlavorNode): boolean => {
                          if (node.name === f) return true;
                          if (node.children) {
                            return node.children.some(findInCategory);
                          }
                          return false;
                        };
                        if (findInCategory(category)) {
                          return category.name;
                        }
                      }
                      return "Unknown";
                    })).size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Body paths:
                  </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {body.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Adjectives:
                  </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {adjectives.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
