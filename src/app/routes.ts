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
  shots: "/shots",
  beans: {
    path: "/beans",
    beanId: {
      path: "/:id",
    },
    compare: "/compare",
  },
  stats: "/stats",
  shot: {
    path: "/shot",
    id: { path: "/:id" },
  },
  settings: {
    path: "/settings",
    integrations: "/integrations",
    billing: "/billing",
    advance: "/advance",
  },
  tasting: "/tasting",
  login: { path: "/login", _is_public: true },
  company: { path: "/company", _is_public: true },
  careers: { path: "/careers", _is_public: true },
  contact: { path: "/contact", _is_public: true },
  socialMedia: { path: "/social-media", _is_public: true },
  resources: {
    path: "/resources",
    _is_public: true,
    shotLog: { path: "/shot-log", _is_public: true },
    glossary: { path: "/glossary", _is_public: true },
  },
  share: {
    path: "/share",
    _is_public: true,
    uid: {
      path: "/:uid",
    },
    beans: {
      path: "/beans",
      slug: {
        path: "/:slug",
        _is_public: true,
      },
    },
  },
  puckingAdmin: {
    path: "/pucking-admin",
    _require_super_admin: true,
    users: { path: "/users", _require_super_admin: true },
    beans: { path: "/beans", _require_super_admin: true },
    shots: { path: "/shots", _require_super_admin: true },
    subscriptions: { path: "/subscriptions", _require_super_admin: true },
    billing: { path: "/billing", _require_super_admin: true },
    feedback: { path: "/feedback", _require_super_admin: true },
    equipment: {
      path: "/equipment",
      _require_super_admin: true,
      tools: { path: "/tools", _require_super_admin: true },
      machines: { path: "/machines", _require_super_admin: true },
      grinders: { path: "/grinders", _require_super_admin: true },
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
    search: "/search",
    compare: "/compare",
    beanId: {
      path: "/:id",
      shares: "/shares",
      shareId: {
        path: "/shares/:shareId",
        accept: "/accept",
      },
      generalAccess: "/general-access",
      addToCollection: "/add-to-collection",
      shareMyShots: "/share-my-shots",
      duplicate: "/duplicate",
      shots: "/shots",
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
    count: "/count",
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
    shotMetrics: "/shot-metrics",
    dashboard: "/dashboard",
    flavors: "/flavors",
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
  // Admin (super-admin only)
  admin: {
    path: "/api/admin",
    users: {
      path: "/users",
      userId: { path: "/:id" },
    },
    subscriptions: {
      path: "/subscriptions",
      fixEntitlements: { path: "/fix-entitlements" },
      mismatchCount: { path: "/mismatch-count" },
    },
    billing: {
      path: "/billing",
      catalog: { path: "/catalog" },
      sync: { path: "/sync" },
    },
    beans: { path: "/beans" },
    shots: { path: "/shots" },
    stats: { path: "/stats" },
    feedback: {
      path: "/feedback",
      feedbackId: { path: "/:id" },
      bulk: { path: "/bulk" },
    },
    equipment: {
      path: "/equipment",
      tools: {
        path: "/tools",
        toolId: { path: "/:id" },
      },
      machines: {
        path: "/machines",
        machineId: { path: "/:id" },
      },
      grinders: {
        path: "/grinders",
        grinderId: { path: "/:id" },
      },
    },
  },
  // Shares
  shares: {
    path: "/api/shares",
    invites: "/invites",
    shareId: {
      path: "/:uid",
    },
    beans: {
      path: "/beans",
      slug: {
        path: "/:slug",
        stats: "/stats",
      },
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
  // Assets (static JSON data served by ID)
  assets: {
    path: "/api/assets",
    data: {
      path: "/data",
      id: "/:id",
    },
  },
  // Contact
  contact: {
    path: "/api/contact",
  },
  // Feedback
  feedback: {
    path: "/api/feedback",
  },
  // Billing
  billing: {
    path: "/api/billing",
    checkout: "/checkout",
    portal: "/portal",
    entitlements: "/entitlements",
    plans: "/plans",
  },
  // Webhooks
  webhooks: {
    path: "/api/webhooks",
    stripe: "/stripe",
  },
});
