// A mapping of route names to their paths.
export const AppRoutes = {
  home: {
    path: "/",
  },
  log: {
    path: "/log",
  },
  history: {
    path: "/history",
  },
  dashboard: {
    path: "/dashboard",
  },
  settings: {
    path: "/settings",
  },
  settingsIntegrations: {
    path: "/settings/integrations",
  },
  login: {
    path: "/login",
  },
};

export const ApiRoutes = {
  // Auth
  auth: {
    path: "/api/auth/[...nextauth]",
  },
  // Users
  users: {
    path: "/api/users",
  },
  // Beans
  beans: {
    path: "/api/beans",
  },
  bean: {
    path: "/api/beans/:id",
  },
  // Equipment
  grinders: {
    path: "/api/equipment/grinders",
  },
  machines: {
    path: "/api/equipment/machines",
  },
  tools: {
    path: "/api/equipment/tools",
  },
  // Shots
  shots: {
    path: "/api/shots",
  },
  shot: {
    path: "/api/shots/:id",
  },
  shotReference: {
    path: "/api/shots/:id/reference",
  },
  shotHidden: {
    path: "/api/shots/:id/hide",
  },
  // Stats
  statsOverview: {
    path: "/api/stats/overview",
  },
  statsByBean: {
    path: "/api/stats/by-bean/:beanId",
  },
  statsByUser: {
    path: "/api/stats/by-user/:userId",
  },
  // Integrations
  integrations: {
    path: "/api/integrations",
  },
  integration: {
    path: "/api/integrations/:id",
  },
  integrationsValidate: {
    path: "/api/integrations/validate",
  },
};

type Path = string;
type Params = Record<string, string | number>;

/**
 * Replaces path parameters with their values.
 *
 * @example
 * resolvePath("/users/:id", { id: 1 }) // "/users/1"
 */
export function resolvePath(path: Path, params: Params = {}): Path {
  let resolvedPath = path;
  for (const key in params) {
    const value = params[key];
    resolvedPath = resolvedPath.replace(`:${key}`, String(value));
  }
  return resolvedPath;
}
