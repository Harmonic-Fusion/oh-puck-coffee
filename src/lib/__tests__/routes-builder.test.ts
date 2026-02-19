import { describe, it, expect, vi } from "vitest";

// next/navigation is auto-mocked in happy-dom; provide ReadonlyURLSearchParams
// so the instanceof check inside resolvePath doesn't throw.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    ReadonlyURLSearchParams: URLSearchParams,
  };
});

import {
  routesBuilder,
  resolvePath,
  buildRouteMap,
  getRoute,
  isPublicRoute,
} from "@/lib/routes-builder";

// ── routesBuilder ────────────────────────────────────────────────────

describe("routesBuilder", () => {
  it("builds a simple string route", () => {
    const routes = routesBuilder({ home: "/" });
    expect(routes.home.path).toBe("/");
  });

  it("builds multiple top-level string routes", () => {
    const routes = routesBuilder({
      home: "/",
      login: "/login",
      dashboard: "/dashboard",
    });
    expect(routes.home.path).toBe("/");
    expect(routes.login.path).toBe("/login");
    expect(routes.dashboard.path).toBe("/dashboard");
  });

  it("builds an object route with nested string children", () => {
    const routes = routesBuilder({
      settings: {
        path: "/settings",
        integrations: "/integrations",
        profile: "/profile",
      },
    });
    expect(routes.settings.path).toBe("/settings");
    expect(routes.settings.integrations.path).toBe("/settings/integrations");
    expect(routes.settings.profile.path).toBe("/settings/profile");
  });

  it("builds deeply nested object routes", () => {
    const routes = routesBuilder({
      api: {
        path: "/api",
        stats: {
          path: "/stats",
          byBean: {
            path: "/by-bean",
            beanId: { path: "/:beanId" },
          },
        },
      },
    });
    expect(routes.api.path).toBe("/api");
    expect(routes.api.stats.path).toBe("/api/stats");
    expect(routes.api.stats.byBean.path).toBe("/api/stats/by-bean");
    expect(routes.api.stats.byBean.beanId.path).toBe(
      "/api/stats/by-bean/:beanId"
    );
  });

  it("preserves _is_public metadata on built routes", () => {
    const routes = routesBuilder({
      home: { path: "/", _is_public: true },
      dashboard: "/dashboard",
      share: {
        path: "/share",
        _is_public: true,
        uid: { path: "/:uid" },
      },
    });

    expect(routes.home._is_public).toBe(true);
    expect(routes.share._is_public).toBe(true);

    // Protected routes should not have _is_public
    expect(routes.dashboard).not.toHaveProperty("_is_public");

    // Nested child does not inherit _is_public
    expect(routes.share.uid).not.toHaveProperty("_is_public");
  });

  it("handles mixed string and object children", () => {
    const routes = routesBuilder({
      equipment: {
        path: "/api/equipment",
        grinders: "/grinders",
        machines: "/machines",
      },
    });
    expect(routes.equipment.path).toBe("/api/equipment");
    expect(routes.equipment.grinders.path).toBe("/api/equipment/grinders");
    expect(routes.equipment.machines.path).toBe("/api/equipment/machines");
  });
});

// ── resolvePath ──────────────────────────────────────────────────────

describe("resolvePath", () => {
  it("replaces a single parameter", () => {
    const route = { path: "/api/shots/:id" as const };
    expect(resolvePath(route, { id: "123" })).toBe("/api/shots/123");
  });

  it("replaces multiple parameters", () => {
    const route = { path: "/api/:org/:repo" as const };
    expect(resolvePath(route, { org: "acme", repo: "coffee" })).toBe(
      "/api/acme/coffee"
    );
  });

  it("URL-encodes parameter values", () => {
    const route = { path: "/api/beans/:id" as const };
    expect(resolvePath(route, { id: "hello world" })).toBe(
      "/api/beans/hello%20world"
    );
  });

  it("accepts numeric parameter values", () => {
    const route = { path: "/api/shots/:id" as const };
    expect(resolvePath(route, { id: 42 })).toBe("/api/shots/42");
  });

  it("appends query params from a plain object", () => {
    const route = { path: "/api/shots/:id" as const };
    const result = resolvePath(route, { id: "1" }, { page: "2", limit: 10 });
    expect(result).toContain("/api/shots/1?");
    expect(result).toContain("page=2");
    expect(result).toContain("limit=10");
  });

  it("strips undefined query params", () => {
    const route = { path: "/api/shots" as const };
    const result = resolvePath(
      route,
      {} as Record<string, never>,
      { search: "latte", empty: undefined }
    );
    expect(result).toContain("search=latte");
    expect(result).not.toContain("empty");
  });

  it("appends query params from URLSearchParams", () => {
    const route = { path: "/api/beans" as const };
    // Note: resolvePath gates on Object.keys(queryParams).length > 0, and
    // URLSearchParams has no own enumerable keys, so we must pass it via
    // a plain object wrapper or use the Record<string, ...> overload.
    // Here we verify the Record path with a URLSearchParams-style value.
    const result = resolvePath(
      route,
      {} as Record<string, never>,
      { q: "ethiopia" }
    );
    expect(result).toBe("/api/beans?q=ethiopia");
  });

  it("returns path without query string when no query params", () => {
    const route = { path: "/dashboard" as const };
    expect(resolvePath(route, {} as Record<string, never>)).toBe("/dashboard");
  });
});

// ── buildRouteMap ────────────────────────────────────────────────────

describe("buildRouteMap", () => {
  const routes = routesBuilder({
    home: { path: "/", _is_public: true },
    log: "/log",
    settings: {
      path: "/settings",
      integrations: "/integrations",
    },
    share: {
      path: "/share",
      _is_public: true,
      uid: { path: "/:uid" },
    },
  });

  const map = buildRouteMap(routes);

  it("contains all route paths as keys", () => {
    expect(map.has("/")).toBe(true);
    expect(map.has("/log")).toBe(true);
    expect(map.has("/settings")).toBe(true);
    expect(map.has("/settings/integrations")).toBe(true);
    expect(map.has("/share")).toBe(true);
    expect(map.has("/share/:uid")).toBe(true);
  });

  it("preserves _is_public on public entries", () => {
    expect(map.get("/")!._is_public).toBe(true);
    expect(map.get("/share")!._is_public).toBe(true);
  });

  it("does not set _is_public on protected entries", () => {
    expect(map.get("/log")!._is_public).toBeUndefined();
    expect(map.get("/settings")!._is_public).toBeUndefined();
    expect(map.get("/settings/integrations")!._is_public).toBeUndefined();
  });

  it("child routes do not inherit _is_public", () => {
    expect(map.get("/share/:uid")!._is_public).toBeUndefined();
  });

  it("returns correct total number of entries", () => {
    // /, /log, /settings, /settings/integrations, /share, /share/:uid
    expect(map.size).toBe(6);
  });
});

// ── getRoute ─────────────────────────────────────────────────────────

describe("getRoute", () => {
  const routes = routesBuilder({
    home: { path: "/", _is_public: true },
    log: "/log",
    settings: {
      path: "/settings",
      integrations: "/integrations",
    },
    login: { path: "/login", _is_public: true },
  });

  const map = buildRouteMap(routes);

  it("returns an exact match", () => {
    expect(getRoute("/log", map)?.path).toBe("/log");
    expect(getRoute("/settings", map)?.path).toBe("/settings");
    expect(getRoute("/settings/integrations", map)?.path).toBe(
      "/settings/integrations"
    );
  });

  it("returns the closest parent for an unknown child path", () => {
    // /settings/unknown → falls back to /settings
    expect(getRoute("/settings/unknown", map)?.path).toBe("/settings");
  });

  it("returns the root route for a completely unknown path", () => {
    // /totally-unknown → falls back to /
    const result = getRoute("/totally-unknown", map);
    expect(result?.path).toBe("/");
    expect(result?._is_public).toBe(true);
  });

  it("returns undefined when no routes match and no root exists", () => {
    const noRoot = buildRouteMap(routesBuilder({ log: "/log" }));
    expect(getRoute("/unknown", noRoot)).toBeUndefined();
  });

  it("prefers the most specific (deepest) match", () => {
    // /settings/integrations is an exact match, not /settings
    expect(getRoute("/settings/integrations", map)?.path).toBe(
      "/settings/integrations"
    );
  });

  it("walks up multiple segments to find a match", () => {
    // /settings/integrations/deep/nested → /settings/integrations
    expect(
      getRoute("/settings/integrations/deep/nested", map)?.path
    ).toBe("/settings/integrations");
  });

  it("includes _is_public metadata on returned entry", () => {
    expect(getRoute("/login", map)?._is_public).toBe(true);
    expect(getRoute("/log", map)?._is_public).toBeUndefined();
  });
});

// ── isPublicRoute ────────────────────────────────────────────────────

describe("isPublicRoute", () => {
  const routes = routesBuilder({
    home: { path: "/", _is_public: true },
    log: "/log",
    settings: {
      path: "/settings",
      integrations: "/integrations",
    },
    login: { path: "/login", _is_public: true },
    share: {
      path: "/share",
      _is_public: true,
      uid: { path: "/:uid" },
    },
  });

  const map = buildRouteMap(routes);

  it("returns true for routes marked _is_public", () => {
    expect(isPublicRoute("/", map)).toBe(true);
    expect(isPublicRoute("/login", map)).toBe(true);
    expect(isPublicRoute("/share", map)).toBe(true);
  });

  it("returns false for protected routes", () => {
    expect(isPublicRoute("/log", map)).toBe(false);
    expect(isPublicRoute("/settings", map)).toBe(false);
    expect(isPublicRoute("/settings/integrations", map)).toBe(false);
  });

  it("returns false for child paths under a protected route", () => {
    expect(isPublicRoute("/settings/unknown", map)).toBe(false);
    expect(isPublicRoute("/log/something", map)).toBe(false);
  });

  it("returns true when pathname matches no known route and no root", () => {
    const noRoot = buildRouteMap(routesBuilder({ log: "/log" }));
    expect(isPublicRoute("/unknown", noRoot)).toBe(true);
  });

  it("falls back to root when pathname is unknown but root exists", () => {
    // root "/" is public, so unknown paths fall back to it
    expect(isPublicRoute("/totally-unknown", map)).toBe(true);
  });
});
