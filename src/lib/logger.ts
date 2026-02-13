/**
 * Configurable logging library with nested contexts and message filtering.
 * 
 * Supports Python-style logging configuration via LOG_CONFIG environment variable.
 * 
 * Example configuration:
 *   LOG_CONFIG='{"root":"info","auth":"debug","auth.middleware":"warn","api":"error"}'
 * 
 * This allows setting different log levels for different modules:
 * - "root": Sets the default log level for all loggers
 * - "auth": Sets log level for all loggers with "auth" context
 * - "auth.middleware": Sets log level for loggers with ["auth", "middleware"] contexts
 * - "api": Sets log level for all loggers with "api" context
 * 
 * Module paths use dot notation and are matched from most specific to least specific.
 * If no module-specific level is found, falls back to root level.
 * 
 * Usage:
 *   const logger = createLogger("auth", "debug");
 *   logger.debug("This will only log if auth level is debug or lower");
 *   
 *   const childLogger = logger.child("middleware");
 *   childLogger.debug("This checks auth.middleware level first, then auth, then root");
 */

type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

interface LoggerConfig {
  level: LogLevel;
  enableFiltering: boolean;
  moduleLevels?: Record<string, LogLevel>;
}

let globalConfig: LoggerConfig = {
  level: "info",
  enableFiltering: true,
  moduleLevels: {},
};

let consoleIntercepted = false;

/**
 * Patterns to filter out from logs
 */
const FILTER_PATTERNS = [
  /\[AppIntegration\].*Sending.*message to native core/,
];

function shouldFilterMessage(message: string): boolean {
  if (!globalConfig.enableFiltering) return false;
  return FILTER_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Initialize the logger with configuration.
 * Should be called early in the application lifecycle.
 */
export function initLogger(config: LoggerConfig): void {
  globalConfig = config;
  if (!consoleIntercepted) {
    interceptConsole();
    consoleIntercepted = true;
  }
}

/**
 * Intercept console methods to filter unwanted messages.
 */
function interceptConsole(): void {
  if (typeof window === "undefined") {
    // Server-side: intercept console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const createInterceptor = (original: typeof console.log) => {
      return (...args: unknown[]): void => {
        const message = args.map((arg) => 
          typeof arg === "string" ? arg : JSON.stringify(arg)
        ).join(" ");
        
        if (shouldFilterMessage(message)) {
          return; // Filter out the message
        }
        
        original.apply(console, args);
      };
    };

    console.log = createInterceptor(originalLog);
    console.error = createInterceptor(originalError);
    console.warn = createInterceptor(originalWarn);
    console.info = createInterceptor(originalInfo);
    console.debug = createInterceptor(originalDebug);
  } else {
    // Client-side: intercept console methods
    const originalLog = console.log.bind(console);
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalInfo = console.info.bind(console);
    const originalDebug = console.debug.bind(console);

    const createInterceptor = (original: typeof console.log) => {
      return (...args: unknown[]): void => {
        const message = args.map((arg) => 
          typeof arg === "string" ? arg : JSON.stringify(arg)
        ).join(" ");
        
        if (shouldFilterMessage(message)) {
          return; // Filter out the message
        }
        
        original(...args);
      };
    };

    console.log = createInterceptor(originalLog);
    console.error = createInterceptor(originalError);
    console.warn = createInterceptor(originalWarn);
    console.info = createInterceptor(originalInfo);
    console.debug = createInterceptor(originalDebug);
  }
}

/**
 * Get the effective log level for a given context path.
 * Checks module-specific levels first, then falls back to root level.
 */
function getEffectiveLevel(contexts: string[]): LogLevel {
  if (!globalConfig.moduleLevels || Object.keys(globalConfig.moduleLevels).length === 0) {
    return globalConfig.level;
  }

  // Check from most specific to least specific
  // e.g., ["auth", "middleware"] -> check "auth.middleware", then "auth", then root
  for (let i = contexts.length; i > 0; i--) {
    const path = contexts.slice(0, i).join(".");
    if (globalConfig.moduleLevels[path]) {
      return globalConfig.moduleLevels[path];
    }
  }

  return globalConfig.level;
}

function shouldLog(level: LogLevel, contexts: string[]): boolean {
  const effectiveLevel = getEffectiveLevel(contexts);
  return LOG_LEVELS[level] <= LOG_LEVELS[effectiveLevel];
}

function formatContext(contexts: string[]): string {
  return contexts.map((ctx) => `[${ctx}]`).join("");
}

class Logger {
  private contexts: string[];

  constructor(...contexts: string[]) {
    this.contexts = contexts;
  }

  /**
   * Create a nested logger with additional context.
   */
  child(...additionalContexts: string[]): Logger {
    return new Logger(...this.contexts, ...additionalContexts);
  }

  error(message: string, ...args: unknown[]): void {
    if (!shouldLog("error", this.contexts)) return;
    const prefix = formatContext(this.contexts);
    console.error(`${prefix} ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!shouldLog("warn", this.contexts)) return;
    const prefix = formatContext(this.contexts);
    console.warn(`${prefix} ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!shouldLog("info", this.contexts)) return;
    const prefix = formatContext(this.contexts);
    console.log(`${prefix} ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (!shouldLog("debug", this.contexts)) return;
    const prefix = formatContext(this.contexts);
    console.log(`${prefix} ${message}`, ...args);
  }
}

/**
 * Create a logger instance with the given context(s).
 */
export function createLogger(...contexts: string[]): Logger {
  return new Logger(...contexts);
}

/**
 * Default logger without context.
 */
export const logger = createLogger();
