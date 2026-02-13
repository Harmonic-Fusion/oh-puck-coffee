"use client";

import { useEffect } from "react";
import { initLogger } from "@/lib/logger";

/**
 * Client-side logger initialization component.
 * This ensures the logger is initialized on the client side.
 */
export function LoggerInit() {
  useEffect(() => {
    // Initialize logger on client side
    // Note: config is server-side only, so we use environment variables directly
    // Default to "info" in production, "debug" in development
    const isProduction = process.env.NODE_ENV === "production";
    const logLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL || 
      (isProduction ? "info" : "debug")) as "error" | "warn" | "info" | "debug";
    const enableFiltering = process.env.NEXT_PUBLIC_LOG_FILTERING_ENABLED !== "false";
    
    // Parse LOG_CONFIG if provided (Python-style logging config)
    let moduleLevels: Record<string, "error" | "warn" | "info" | "debug"> | undefined;
    let effectiveLogLevel = logLevel;
    const logConfig = process.env.NEXT_PUBLIC_LOG_CONFIG;
    if (logConfig) {
      try {
        const parsed = JSON.parse(logConfig) as Record<string, string>;
        moduleLevels = {};
        for (const [path, level] of Object.entries(parsed)) {
          if (["error", "warn", "info", "debug"].includes(level)) {
            if (path === "root") {
              // "root" overrides the default log level
              effectiveLogLevel = level as "error" | "warn" | "info" | "debug";
            } else {
              moduleLevels[path] = level as "error" | "warn" | "info" | "debug";
            }
          }
        }
        if (Object.keys(moduleLevels).length === 0) {
          moduleLevels = undefined;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    initLogger({
      level: effectiveLogLevel,
      enableFiltering,
      moduleLevels,
    });
  }, []);

  return null;
}
