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
  equipment: "/equipment",
  stats: "/stats",
  billing: "/billing",
  shot: {
    path: "/shot",
    id: { path: "/:id" },
  },
  settings: {
    path: "/settings",
    integrations: "/integrations",
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
      item: { path: "/:id", _require_super_admin: true },
      tools: { path: "/tools", _require_super_admin: true },
      machines: { path: "/machines", _require_super_admin: true },
      grinders: { path: "/grinders", _require_super_admin: true },
    },
  },
});

/** Flat path → route map for O(1) lookups (used by middleware). */
export const AppRouteMap = buildRouteMap(AppRoutes);

const apiRoutesBuilt = routesBuilder({
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
    grinders: {
      path: "/grinders",
      grinderId: { path: "/:id" },
    },
    machines: {
      path: "/machines",
      machineId: { path: "/:id" },
    },
    tools: {
      path: "/tools",
      toolId: { path: "/:id" },
    },
    /** Kettle, scale, pour over, etc. — list + PATCH photo */
    items: {
      path: "/items",
      itemId: { path: "/:id" },
    },
    my: {
      path: "/my",
      grinders: {
        path: "/grinders",
        grinderId: { path: "/:id" },
      },
      machines: {
        path: "/machines",
        machineId: { path: "/:id" },
      },
      tools: {
        path: "/tools",
        toolId: { path: "/:id" },
      },
      items: {
        path: "/items",
        itemId: { path: "/:id" },
      },
    },
  },
  // Images (generic uploads; attach to shots via shot routes)
  images: {
    path: "/api/images",
    imageId: {
      path: "/:id",
    },
  },
  // Shots
  shots: {
    path: "/api/shots",
    count: "/count",
    shotId: {
      path: "/:id",
      reference: "/reference",
      hidden: "/hide",
      images: {
        path: "/images",
        imageId: {
          path: "/:imageId",
        },
      },
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
      search: "/search",
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
      links: {
        path: "/links",
        linkId: { path: "/:linkId" },
      },
      equipmentId: {
        path: "/:id",
        links: "/links",
        searchLinks: "/search-links",
        searchSpecs: "/search-specs",
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
  /** Metered shot-suggestion chats (Vercel AI). Paths live under `/api/chats`, not `/api/ai/...`, to avoid duplicating the `api` + `ai` namespace in URLs and route maps. */
  chats: {
    path: "/api/chats",
    usage: "/usage",
  },
  /** Internal/cron: refresh rolling markdown memory (not metered). */
  aiMemoryRefresh: "/api/ai-memory/refresh",
});

/**
 * `RouteSpec` in `@/lib/routes-builder` includes `[key: string]: …`, so TypeScript widens `keyof`
 * for nested route nodes and `BuiltRouteObject` stops preserving specific children. That shows up
 * on deep branches like `equipment.my.*` / `*.grinderId`, not because `equipment` is wrong here.
 *
 * Wrapping everything under `api: { path: "/api", equipment: { path: "/equipment", … } }` would
 * only change access shape (`ApiRoutes.api.equipment…`); it does not remove the index signature,
 * so the same inference loss would apply unless `RouteSpec` / the builder types are changed.
 */
export type ApiEquipmentRoutesTree = {
  path: string;
  grinders: { path: string; grinderId: { path: string } };
  machines: { path: string; machineId: { path: string } };
  tools: { path: string; toolId: { path: string } };
  items: { path: string; itemId: { path: string } };
  my: {
    path: string;
    grinders: { path: string; grinderId: { path: string } };
    machines: { path: string; machineId: { path: string } };
    tools: { path: string; toolId: { path: string } };
    items: { path: string; itemId: { path: string } };
  };
};

/** Preserves `admin.equipment.*` children for `resolvePath` (avoids index-signature collapse). */
export type AdminApiEquipmentRoutesTree = {
  path: string;
  search: { path: string };
  tools: { path: string; toolId: { path: string } };
  machines: { path: string; machineId: { path: string } };
  grinders: { path: string; grinderId: { path: string } };
  links: { path: string; linkId: { path: string } };
  equipmentId: {
    path: string;
    links: { path: string };
    searchLinks: { path: string };
    searchSpecs: { path: string };
  };
};

export const ApiRoutes = {
  ...apiRoutesBuilt,
  equipment: apiRoutesBuilt.equipment as ApiEquipmentRoutesTree,
  admin: {
    ...apiRoutesBuilt.admin,
    equipment: apiRoutesBuilt.admin.equipment as AdminApiEquipmentRoutesTree,
  },
} as typeof apiRoutesBuilt & {
  equipment: ApiEquipmentRoutesTree;
  admin: Omit<(typeof apiRoutesBuilt)["admin"], "equipment"> & {
    equipment: AdminApiEquipmentRoutesTree;
  };
};
