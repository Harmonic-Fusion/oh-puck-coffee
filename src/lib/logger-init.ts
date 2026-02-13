/**
 * Initialize logger early in the application lifecycle.
 * This should be imported at the top of entry points.
 */

import { initLogger } from "./logger";
import { config } from "@/shared/config";

// Initialize logger with config
// If LOG_CONFIG has a "root" key, it overrides the default logLevel
const rootLevel = (config.logConfig?.root as "error" | "warn" | "info" | "debug" | undefined) ?? config.logLevel;
const moduleLevels = config.logConfig
  ? (Object.fromEntries(
      Object.entries(config.logConfig).filter(([key]) => key !== "root")
    ) as Record<string, "error" | "warn" | "info" | "debug">)
  : undefined;

initLogger({
  level: rootLevel,
  enableFiltering: config.logFilteringEnabled,
  moduleLevels: moduleLevels && Object.keys(moduleLevels).length > 0 ? moduleLevels : undefined,
});
