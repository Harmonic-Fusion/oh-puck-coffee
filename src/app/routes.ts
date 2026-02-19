// DO NOT DEPEND ON OTHER MODULES IN THIS FILE. ONLY IMPORT FROM `@/lib/routes-builder`.
import { routesBuilder, resolvePath, buildRouteMap } from "@/lib/routes-builder";

export { resolvePath };

// ── App routes ───────────────────────────────────────────────────────
// Routes without `_is_public` require authentication (the (app) route group).
// Mark any landing, auth, or share page as `_is_public: true` so the
// middleware knows to let unauthenticated users through.
export const AppRoutes = routesBuilder({
  home: { path: "/", _is_public: true },
  log: "/log",
  history: "/history",
  dashboard: "/dashboard",
  settings: {
    path: "/settings",
    integrations: "/integrations",
  },
  login: { path: "/login", _is_public: true },
  company: { path: "/company", _is_public: true },
  careers: { path: "/careers", _is_public: true },
  contact: { path: "/contact", _is_public: true },
  socialMedia: { path: "/social-media", _is_public: true },
  share: {
    path: "/share",
    _is_public: true,
    uid: {
      path: "/:uid",
    },
  },
});

/** Flat path → route map for O(1) lookups (used by middleware). */
export const AppRouteMap = buildRouteMap(AppRoutes);

export const ApiRoutes = routesBuilder({
  // Health
  health: "/api/health",
  // Auth
  auth: {
    path: "/api/auth",
    nextauth: "/[...nextauth]",
    debug: "/debug",
  },
  // Users
  users: {
    path: "/api/users",
    me: "/me",
  },
  // Beans
  beans: {
    path: "/api/beans",
    beanId: {
      path: "/:id",
    },
  },
  // Equipment
  equipment: {
    path: "/api/equipment",
    grinders: "/grinders",
    machines: "/machines",
    tools: "/tools",
  },
  // Shots
  shots: {
    path: "/api/shots",
    shotId: {
      path: "/:id",
      reference: "/reference",
      hidden: "/hide",
    },
  },
  // Stats
  stats: {
    path: "/api/stats",
    overview: "/overview",
    byBean: {
      path: "/by-bean",
      beanId: {
        path: "/:beanId",
      },
    },
    byUser: {
      path: "/by-user",
      userId: {
        path: "/:userId",
      },
    },
  },
  // Shares
  shares: {
    path: "/api/shares",
    shareId: {
      path: "/:uid",
    },
  },
  // Integrations
  integrations: {
    path: "/api/integrations",
    integrationId: {
      path: "/:id",
    },
    validate: "/validate",
  },
  // Contact
  contact: {
    path: "/api/contact",
  },
  // Feedback
  feedback: {
    path: "/api/feedback",
  },
});
