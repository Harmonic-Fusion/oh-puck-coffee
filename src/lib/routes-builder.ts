import { ReadonlyURLSearchParams } from "next/navigation";

// Type definitions for route building
type RouteSpec =
  | string
  | { path: string; _is_public?: true; [key: string]: RouteSpec | true | undefined };

// Metadata keys — these are NOT child routes
type RouteMetaKeys = "path" | "_is_public";

// Extract path parameters from a path string
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

// Type for resolvePath parameters
type ResolveParams<T extends string> = {
  [K in ExtractParams<T>]: string | number;
};

// Type that represents the final route structure after building
type BuiltRouteObject<T extends RouteSpec> = T extends string
  ? { path: string }
  : T extends { path: string; [key: string]: RouteSpec | true | undefined }
    ? {
        path: string;
        _is_public?: true;
      } & {
        [K in keyof Omit<T, RouteMetaKeys>]: BuiltRouteObject<T[K] & RouteSpec>;
      }
    : never;

// Type that builds the complete route structure from a RouteSpec
type BuildRoutes<T extends Record<string, RouteSpec>> = {
  [K in keyof T]: BuiltRouteObject<T[K]>;
};

/**
 * Builds a nested route structure from a specification object.
 * Each nested object with a 'path' property gets its path computed by concatenating parent paths.
 */
export function routesBuilder<T extends Record<string, RouteSpec>>(
  spec: T
): BuildRoutes<T> {
  const result: Partial<BuildRoutes<T>> = {};

  for (const [key, value] of Object.entries(spec)) {
    result[key as keyof BuildRoutes<T>] = buildRoutesRecursive(
      value,
      ""
    ) as BuiltRouteObject<T[Extract<keyof T, string>]>;
  }

  return result as BuildRoutes<T>;
}

/**
 * Recursively builds routes by concatenating parent paths.
 */
function buildRoutesRecursive<T extends RouteSpec>(
  spec: T,
  parentPath: string,
  visited = new WeakSet<object>()
): BuiltRouteObject<T> | string {
  if (typeof spec === "string") {
    return { path: parentPath + spec } as BuiltRouteObject<T>;
  }

  if (typeof spec === "object" && spec !== null && "path" in spec) {
    // Check for circular references
    if (visited.has(spec)) {
      return "[Circular Reference]";
    }
    visited.add(spec);

    const { path, _is_public, ...rest } = spec;
    const fullPath = parentPath + path;

    const result: Record<string, BuiltRouteObject<RouteSpec> | string | true> = {
      path: fullPath,
    };

    if (_is_public) {
      result._is_public = true;
    }

    for (const [key, value] of Object.entries(rest)) {
      if (typeof value === "string") {
        result[key] = { path: fullPath + value };
      } else if (typeof value === "object" && value !== null && "path" in value) {
        result[key] = buildRoutesRecursive(value, fullPath, visited);
      } else {
        result[key] = buildRoutesRecursive(
          value as RouteSpec,
          fullPath,
          visited
        );
      }
    }

    return result as BuiltRouteObject<T>;
  }

  return spec as unknown as BuiltRouteObject<T>;
}

/**
 * Resolves a path by replacing parameter placeholders with actual values.
 *
 * @param route - The route object containing the path string
 * @param params - Object containing parameter values
 * @param queryParams - Optional query parameters to append
 * @returns The resolved path string
 *
 * @example
 * resolvePath(ApiRoutes.shots.shotId, { id: "123" }) // "/api/shots/123"
 * resolvePath(ApiRoutes.stats.byBean.beanId, { beanId: "abc" }) // "/api/stats/by-bean/abc"
 */
export function resolvePath<T extends string>(
  route: { path: T },
  params: ResolveParams<T>,
  queryParams:
    | ReadonlyURLSearchParams
    | URLSearchParams
    | Record<string, string | undefined | number | boolean> = {}
): string {
  if (typeof route.path !== "string") {
    return String(route.path);
  }

  let resolvedPath: string = route.path;

  // Replace each parameter in the path
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `:${key}`;
    const encodedValue = encodeURIComponent(String(value));
    resolvedPath = resolvedPath.replace(
      new RegExp(placeholder, "g"),
      encodedValue
    );
  }

  // Ensure path starts with '/'
  if (!resolvedPath.startsWith("/")) {
    resolvedPath = `/${resolvedPath}`;
  }

  // Add query parameters to the path
  if (Object.keys(queryParams).length > 0) {
    if (
      queryParams instanceof ReadonlyURLSearchParams ||
      queryParams instanceof URLSearchParams
    ) {
      return `${resolvedPath}?${queryParams.toString()}`;
    } else {
      const queryParamsObject = Object.fromEntries(
        Object.entries(queryParams)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      );
      return `${resolvedPath}?${new URLSearchParams(queryParamsObject).toString()}`;
    }
  }

  return resolvedPath;
}

// ── Route map utilities ──────────────────────────────────────────────

/** A flattened route entry stored in a route map. */
export interface RouteEntry {
  path: string;
  _is_public?: true;
}

/**
 * Flattens a built routes object into a `Map<path, RouteEntry>` for O(1) lookups.
 * Walks all nested route objects recursively.
 */
export function buildRouteMap(
  routes: Record<string, unknown>
): Map<string, RouteEntry> {
  const map = new Map<string, RouteEntry>();

  function walk(obj: unknown): void {
    if (typeof obj !== "object" || obj === null) return;
    const record = obj as Record<string, unknown>;
    if (typeof record.path !== "string") return;

    const entry: RouteEntry = { path: record.path };
    if (record._is_public === true) entry._is_public = true;
    map.set(record.path, entry);

    for (const [key, value] of Object.entries(record)) {
      if (key === "path" || key === "_is_public") continue;
      if (typeof value === "object" && value !== null) walk(value);
    }
  }

  for (const value of Object.values(routes)) {
    walk(value);
  }

  return map;
}

/**
 * Finds the most specific route matching `pathname` via O(1) map lookups.
 * Tries an exact match first, then walks up path segments.
 *
 * @example
 * getRoute("/settings/integrations", map) // → { path: "/settings/integrations" }
 * getRoute("/settings/unknown",      map) // → { path: "/settings" }
 * getRoute("/totally-unknown",        map) // → { path: "/" }  (if "/" is in the map)
 */
export function getRoute(
  pathname: string,
  routeMap: Map<string, RouteEntry>
): RouteEntry | undefined {
  const exact = routeMap.get(pathname);
  if (exact) return exact;

  // Walk up path segments to find the closest parent route
  let end = pathname.length;
  while ((end = pathname.lastIndexOf("/", end - 1)) > 0) {
    const parent = routeMap.get(pathname.slice(0, end));
    if (parent) return parent;
  }

  // Check root
  return routeMap.get("/");
}

/**
 * Returns `true` if `pathname` resolves to a route marked `_is_public`,
 * or if it doesn't match any known route at all (i.e. not protected).
 */
export function isPublicRoute(
  pathname: string,
  routeMap: Map<string, RouteEntry>
): boolean {
  const route = getRoute(pathname, routeMap);
  return route == null || route._is_public === true;
}

export type {
  RouteSpec,
  ResolveParams,
  BuiltRouteObject,
  BuildRoutes,
};
