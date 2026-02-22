"use client";

import { useState, useMemo } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { FlavorNode } from "@/shared/flavor-wheel/types";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel/flavor-wheel-data";
import { getFlavorColor, increaseOpacity } from "@/shared/flavor-wheel/colors";
import { SelectedBadges } from "./SelectedBadges";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface NestedFlavorWheelProps {
  value: string[]; // Array of node names like ["Sweet", "Chocolate", "Dark Chocolate"]
  onChange: (value: string[]) => void; // Output array of node names
}

/**
 * Build a path of node names from root to current node
 */
function buildNodePath(node: FlavorNode, parentPath: string[]): string[] {
  return [...parentPath, node.name];
}

/**
 * Count selected descendants (including self) for a node
 */
function countSelectedDescendants(
  node: FlavorNode,
  nodePath: string[],
  selectedNodes: Set<string>
): number {
  const currentNodePath = buildNodePath(node, nodePath);
  const currentNodeKey = currentNodePath.join(":");
  
  let count = 0;
  
  // Count self if selected
  if (selectedNodes.has(currentNodeKey)) {
    count = 1;
  }
  
  // Recursively count children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      count += countSelectedDescendants(child, currentNodePath, selectedNodes);
    }
  }
  
  return count;
}

/**
 * Collect all selected nodes (including ancestors and leaf nodes)
 */
function collectSelectedNodes(
  node: FlavorNode,
  nodePath: string[],
  selectedNodes: Set<string>,
  result: Array<{ name: string; path: string[] }>
): void {
  const currentNodePath = buildNodePath(node, nodePath);
  const currentNodeKey = currentNodePath.join(":");
  
  // Collect this node if it's selected (including ancestors)
  if (selectedNodes.has(currentNodeKey)) {
    result.push({
      name: node.name,
      path: currentNodePath,
    });
  }
  
  // Recursively collect from children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      collectSelectedNodes(child, currentNodePath, selectedNodes, result);
    }
  }
}

/**
 * Recursive component for rendering a single node in the flavor tree
 */
function FlavorTreeNode({
  node,
  nodePath,
  depth,
  selectedNodes,
  onToggle,
  expandedNodes,
  onToggleExpand,
}: {
  node: FlavorNode;
  nodePath: string[];
  depth: number;
  selectedNodes: Set<string>;
  onToggle: (nodePath: string[]) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (pathKey: string) => void;
}) {
  const currentNodePath = buildNodePath(node, nodePath);
  const pathKey = currentNodePath.join(":");
  const isExpanded = expandedNodes.has(pathKey);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodes.has(pathKey);
  const color = getFlavorColor(currentNodePath);
  const selectedCount = countSelectedDescendants(node, nodePath, selectedNodes);

  const handleRowClick = () => {
    onToggle(currentNodePath);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(pathKey);
  };

  return (
    <div 
      className="select-none"
      style={{
        marginLeft: `${depth * 2}em`,
      }}
    >
      <div
        onClick={handleRowClick}
        className={`flex items-center gap-3 rounded-md px-4 h-16 transition-colors cursor-pointer ${
          depth === 0
            ? "font-semibold"
            : depth === 1
              ? "font-medium"
              : "font-normal"
        }`}
        style={{
          backgroundColor: isSelected 
            ? increaseOpacity(color, 0.5)
            : color,
          border: isSelected ? "2px solid white" : "2px solid transparent",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(currentNodePath);
          }}
          className={`flex-1 text-left text-base flex items-center gap-2 ${
            isSelected
              ? "font-bold text-white"
              : "font-normal text-stone-900 dark:text-stone-100"
          }`}
        >
          <span>{node.name}</span>
          {selectedCount > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-semibold ${
                isSelected
                  ? "bg-white/30 text-white"
                  : "bg-stone-700/20 text-stone-700 dark:bg-stone-300/20 dark:text-stone-300"
              }`}
            >
              {selectedCount}
            </span>
          )}
        </button>
        {hasChildren && (
          <button
            type="button"
            onClick={handleExpandClick}
            className={`flex-shrink-0 h-16 w-16 flex items-center justify-center transition-colors ${
              isSelected 
                ? "text-white hover:bg-white/20" 
                : "text-stone-700 hover:bg-stone-200/50 dark:text-stone-300 dark:hover:bg-stone-700/50"
            }`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {node.children!.map((child) => (
            <FlavorTreeNode
              key={child.name}
              node={child}
              nodePath={currentNodePath}
              depth={depth + 1}
              selectedNodes={selectedNodes}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Nested Flavor Wheel component with recursive tree structure
 */
export function NestedFlavorWheel({
  value,
  onChange,
}: NestedFlavorWheelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Convert value (array of node names) to a Set for quick lookup
  const selectedNodeNames = useMemo(() => {
    // Ensure value is an array
    if (!value) return new Set<string>();
    if (!Array.isArray(value)) return new Set<string>();
    return new Set(value);
  }, [value]);

  // Convert selected node names to a Set of full paths for UI display
  const selectedNodes = useMemo(() => {
    const paths = new Set<string>();
    if (!selectedNodeNames.size) return paths;
    
    // For each selected node name, find all matching nodes in the tree and add their paths
    const findAndAddPaths = (node: FlavorNode, path: string[] = []): void => {
      const currentPath = [...path, node.name];
      const pathKey = currentPath.join(":");
      
      // If this node's name is selected, add its path
      if (selectedNodeNames.has(node.name)) {
        paths.add(pathKey);
      }
      
      // Recursively check children
      if (node.children) {
        for (const child of node.children) {
          findAndAddPaths(child, currentPath);
        }
      }
    };
    
    for (const category of FLAVOR_WHEEL_DATA.children) {
      findAndAddPaths(category);
    }
    
    return paths;
  }, [selectedNodeNames]);

  // Toggle selection for a node path
  const handleToggle = (nodePath: string[]) => {
    // nodePath contains all ancestors: ["Sweet", "Chocolate", "Dark Chocolate"]
    // Extract all node names from the path (all ancestors + selected node)
    const allNodeNames = nodePath;
    const selectedNodeName = nodePath[nodePath.length - 1]; // The actual selected node
    
    // Check if the selected node is currently selected
    const isCurrentlySelected = selectedNodeNames.has(selectedNodeName);

    // Ensure value is an array
    const currentValue = Array.isArray(value) ? value : [];

    if (isCurrentlySelected) {
      // Deselecting: Remove this node and all its descendants
      // First, find all descendants of this node in the tree
      const descendants = new Set<string>();
      const findDescendants = (node: FlavorNode, path: string[] = []): void => {
        const currentPath = [...path, node.name];
        if (currentPath.length > nodePath.length && 
            currentPath.slice(0, nodePath.length).every((n, i) => n === nodePath[i])) {
          descendants.add(node.name);
        }
        if (node.children) {
          for (const child of node.children) {
            findDescendants(child, currentPath);
          }
        }
      };
      
      for (const category of FLAVOR_WHEEL_DATA.children) {
        findDescendants(category);
      }
      
      // Remove the selected node and all its descendants
      const newValue = currentValue.filter((name) => 
        name !== selectedNodeName && !descendants.has(name)
      );
      onChange(newValue);
    } else {
      // Selecting: Add all ancestor nodes + the selected node
      // Use Set to avoid duplicates, then convert back to array
      const newValueSet = new Set([...currentValue, ...allNodeNames]);
      const newValue = Array.from(newValueSet);
      onChange(newValue);
    }
  };

  const handleToggleExpand = (pathKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(pathKey)) {
      newExpanded.delete(pathKey);
    } else {
      newExpanded.add(pathKey);
    }
    setExpandedNodes(newExpanded);
  };

  // Helper function to recursively collect all expandable paths
  const collectAllPaths = (node: FlavorNode, path: string[]): string[] => {
    const currentPath = [...path, node.name];
    const pathKey = currentPath.join(":");
    const paths: string[] = [];
    
    if (node.children && node.children.length > 0) {
      paths.push(pathKey);
      for (const child of node.children) {
        paths.push(...collectAllPaths(child, currentPath));
      }
    }
    return paths;
  };

  const handleExpandAll = () => {
    const allPaths = new Set<string>();
    for (const category of FLAVOR_WHEEL_DATA.children) {
      const paths = collectAllPaths(category, []);
      for (const path of paths) {
        allPaths.add(path);
      }
    }
    setExpandedNodes(allPaths);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const allExpanded = useMemo(() => {
    const allPaths = new Set<string>();
    for (const category of FLAVOR_WHEEL_DATA.children) {
      const paths = collectAllPaths(category, []);
      for (const path of paths) {
        allPaths.add(path);
      }
    }
    return allPaths.size > 0 && Array.from(allPaths).every(path => expandedNodes.has(path));
  }, [expandedNodes]);

  // Extract flavor words for display badges
  const selectedFlavorWords = useMemo(() => {
    const flavors: Array<{ name: string; path: string[] }> = [];
    const flavorsMap = new Map<string, { name: string; path: string[] }>();
    
    // Ensure value is an array
    if (!value || !Array.isArray(value)) return flavors;
    
    // For each selected node name, find all matching nodes in the tree
    const findNodesByName = (nodeName: string, category: FlavorNode, path: string[] = []): void => {
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
          findNodesByName(nodeName, child, currentPath);
        }
      }
    };
    
    // Process nodes in the order they appear in value
    for (const nodeName of value) {
      // Only process if we haven't already found it
      if (!flavorsMap.has(nodeName)) {
        for (const category of FLAVOR_WHEEL_DATA.children) {
          findNodesByName(nodeName, category);
        }
      }
    }
    
    // Build result array preserving the order from value
    const orderedFlavors: Array<{ name: string; path: string[] }> = [];
    for (const nodeName of value) {
      const flavor = flavorsMap.get(nodeName);
      if (flavor) {
        orderedFlavors.push(flavor);
      }
    }
    
    return orderedFlavors;
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Flavors
          </span>
          <InfoTooltip
            helpText="Selecting all the flavors of your coffee. This helps calibrate your palate. The flavors are nested going from overall categories to the specific flavors. If it's overwhelming at first, stay to the higher levels."
            ariaLabel="Flavors help"
          />
        </div>
        <button
          type="button"
          onClick={allExpanded ? handleCollapseAll : handleExpandAll}
          className="h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>
      <div className="space-y-3 rounded-lg border border-stone-200 p-2 pt-4 dark:border-stone-700">
        {FLAVOR_WHEEL_DATA.children.map((category) => (
          <FlavorTreeNode
            key={category.name}
            node={category}
            nodePath={[]}
            depth={0}
            selectedNodes={selectedNodes}
            onToggle={handleToggle}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>
      <SelectedBadges
        title="Selected Flavors"
        items={selectedFlavorWords.map((flavor) => ({
          label: flavor.name,
          color: getFlavorColor(flavor.path),
          key: flavor.name,
        }))}
        onClear={() => onChange([])}
        onReorder={(reorderedItems) => {
          // Map reordered badge items back to node names
          const reorderedNames = reorderedItems.map((item) => item.key || item.label);
          // Update value with the new order, preserving all items
          const currentSet = new Set(value);
          const reorderedSet = new Set(reorderedNames);
          // Keep items in the reordered order, then append any items not in the reordered list
          const orderedItems = reorderedNames.filter((name) => currentSet.has(name));
          const remainingItems = value.filter((name) => !reorderedSet.has(name));
          onChange([...orderedItems, ...remainingItems]);
        }}
      />
    </div>
  );
}
