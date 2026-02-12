import { ReadonlyURLSearchParams } from "next/navigation";

// Type definitions for route building
type RouteSpec = string | { path: string; [key: string]: RouteSpec };

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
  : T extends { path: string; [key: string]: RouteSpec }
    ? {
        path: string;
      } & {
        [K in keyof Omit<T, "path">]: BuiltRouteObject<T[K]>;
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

    const { path, ...rest } = spec;
    const fullPath = parentPath + path;

    const result: Record<string, BuiltRouteObject<RouteSpec> | string> = {
      path: fullPath,
    };

    for (const [key, value] of Object.entries(rest)) {
      if (typeof value === "string") {
        result[key] = { path: fullPath + value };
      } else if (typeof value === "object" && value !== null && "path" in value) {
        result[key] = buildRoutesRecursive(value, fullPath, visited);
      } else {
        result[key] = buildRoutesRecursive(value, fullPath, visited);
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

export type {
  RouteSpec,
  ResolveParams,
  BuiltRouteObject,
  BuildRoutes,
};
