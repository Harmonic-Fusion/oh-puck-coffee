"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NestedFlavorWheel } from "@/components/flavor-wheel/NestedFlavorWheel";
import { NestedBodySelector } from "@/components/flavor-wheel/NestedBodySelector";
import { AdjectivesIntensifiersSelector } from "@/components/flavor-wheel/AdjectivesIntensifiersSelector";
import { SelectedBadges } from "@/components/flavor-wheel/SelectedBadges";
import {
  FLAVOR_WHEELS,
  type FlavorWheelType,
  getFlavorColor,
  getBodyColor,
  getAdjectiveColor,
} from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { ShareIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export default function TastingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize flavor wheel type from URL parameter or localStorage
  const [wheelType, setWheelType] = useState<FlavorWheelType>(() => {
    if (typeof window === "undefined") return "coffee";

    // Check URL parameter first
    const urlParam = searchParams.get("select") as FlavorWheelType | null;
    if (
      urlParam &&
      (urlParam === "coffee" || urlParam === "tea" || urlParam === "whiskey")
    ) {
      // Store the URL parameter choice in localStorage
      localStorage.setItem("flavorWheelType", urlParam);
      return urlParam;
    }

    // Fall back to localStorage
    const stored = localStorage.getItem(
      "flavorWheelType",
    ) as FlavorWheelType | null;
    if (
      stored &&
      (stored === "coffee" || stored === "tea" || stored === "whiskey")
    ) {
      return stored;
    }

    return "coffee";
  });

  const [flavorCategories, setFlavorCategories] = useState<string[]>([]);
  const [body, setBody] = useState<string[]>([]);
  const [adjectives, setAdjectives] = useState<string[]>([]);

  // Get the current flavor wheel data
  const FLAVOR_WHEEL_DATA = FLAVOR_WHEELS[wheelType];

  // Handle wheel type changes
  const handleWheelTypeChange = (newType: FlavorWheelType) => {
    setWheelType(newType);
    localStorage.setItem("flavorWheelType", newType);

    // Update URL parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("select", newType);
    router.push(`/tasting?${params.toString()}`, { scroll: false });

    // Clear selections when switching wheels
    setFlavorCategories([]);
    setFlavorOrder(null);
    setBody([]);
    setAdjectives([]);
  };

  // Track custom order for flavors (set when user reorders)
  const [flavorOrder, setFlavorOrder] = useState<string[] | null>(null);

  // Helper function to find the full path (ancestors + node) for a given node name
  function findNodePath(nodeName: string): string[] | null {
    function searchNode(
      node: FlavorNode,
      path: string[] = [],
    ): string[] | null {
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
        flavorCategories.includes(name),
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
    const findNodeByName = (
      nodeName: string,
      category: FlavorNode,
      path: string[] = [],
    ): void => {
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
  }, [flavorCategories, flavorOrder, FLAVOR_WHEEL_DATA.children]);

  // Compute body badge data
  const bodyBadgeData = useMemo(() => {
    if (body.length === 0) return null;
    const selectedName = body[0];

    return {
      label: selectedName,
      color: getBodyColor(selectedName),
      key: selectedName,
      className: "capitalize",
    };
  }, [body]);

  // Compute adjectives badge data
  const adjectivesBadgeData = useMemo(() => {
    return adjectives.map((adjective) => ({
      label: adjective,
      color: getAdjectiveColor(adjective),
      key: adjective,
    }));
  }, [adjectives]);

  // Generate text representation of tasting notes
  const tastingNotesText = useMemo(() => {
    const parts: string[] = [];

    if (selectedFlavorWords.length > 0) {
      parts.push(
        `Flavors: ${selectedFlavorWords.map((f) => f.name).join(", ")}`,
      );
    }

    if (body.length > 0) {
      parts.push(`Body: ${body[0]}`);
    }

    if (adjectives.length > 0) {
      parts.push(`Adjectives: ${adjectives.join(", ")}`);
    }

    return parts.join("\n");
  }, [selectedFlavorWords, body, adjectives]);

  // Copy to clipboard handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tastingNotesText);
      // Could add a toast notification here if needed
    } catch (err) {
      console.error("Error copying to clipboard:", err);
    }
  };

  // Share handler
  const handleShare = async () => {
    const shareData = {
      title: "Tasting Notes",
      text: tastingNotesText,
    };

    // Check if Web Share API is available
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare
    ) {
      try {
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        // User cancelled — ignore AbortError, fall through for others
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
        // Fall through to clipboard fallback
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(tastingNotesText);
    } catch (clipboardErr) {
      console.error("Error copying to clipboard:", clipboardErr);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            Tasting Notes
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Tool for capturing your tasting notes and improving your palate.
          </p>
        </div>

        {/* Flavor Wheel Selector */}
        <div className="flex flex-col items-end gap-1">
          <select
            id="wheel-select"
            value={wheelType}
            onChange={(e) =>
              handleWheelTypeChange(e.target.value as FlavorWheelType)
            }
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow-sm transition-colors hover:bg-stone-50 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            <option value="coffee">Coffee</option>
            <option value="tea">Tea</option>
            <option value="whiskey">Whiskey</option>
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Selectors Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <NestedFlavorWheel
              value={flavorCategories}
              onChange={handleFlavorCategoriesChange}
              data={FLAVOR_WHEEL_DATA}
            />
          </div>

          {wheelType === "coffee" && (
            <>
              <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
                <NestedBodySelector value={body} onChange={setBody} />
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
                <AdjectivesIntensifiersSelector
                  value={adjectives}
                  onChange={setAdjectives}
                />
              </div>
            </>
          )}
        </div>

        {/* Output/Resolution Column */}
        <div className="space-y-6">
          <div className="sticky bottom-8 space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
              <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-stone-100">
                Tasting Notes
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
                    const reorderedNames = reorderedItems.map(
                      (item) => item.key || item.label,
                    );
                    // Update the custom order
                    setFlavorOrder(reorderedNames);
                    // Also update flavorCategories to match the new order
                    // Filter to only include names that are still in flavorCategories
                    const orderedCategories = reorderedNames.filter((name) =>
                      flavorCategories.includes(name),
                    );
                    // Add any items that weren't in the reordered list (shouldn't happen, but safety check)
                    const remaining = flavorCategories.filter(
                      (name) => !reorderedNames.includes(name),
                    );
                    setFlavorCategories([...orderedCategories, ...remaining]);
                  }}
                />
              </div>

              {/* Selected Body Badge */}
              {wheelType === "coffee" && bodyBadgeData && (
                <div className="mb-6">
                  <SelectedBadges
                    title="Body / Texture"
                    items={[bodyBadgeData]}
                    onClear={() => setBody([])}
                  />
                </div>
              )}

              {/* Selected Adjectives Badges */}
              {wheelType === "coffee" && adjectivesBadgeData.length > 0 && (
                <div className="mb-6">
                  <SelectedBadges
                    title="Adjectives & Intensifiers"
                    items={adjectivesBadgeData}
                    onClear={() => setAdjectives([])}
                    onReorder={(reorderedItems) => {
                      // Map reordered badge items back to adjective names
                      const reorderedNames = reorderedItems.map(
                        (item) => item.key || item.label,
                      );
                      setAdjectives(reorderedNames);
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 border-t border-stone-200 pt-6 dark:border-stone-700">
                <button
                  onClick={handleCopy}
                  disabled={tastingNotesText.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  title="Copy to clipboard"
                >
                  <DocumentDuplicateIcon className="h-5 w-5" />
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  disabled={tastingNotesText.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  title="Share"
                >
                  <ShareIcon className="h-5 w-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
