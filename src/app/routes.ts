// DO NOT DEPEND ON OTHER MODULES IN THIS FILE. ONLY IMPORT FROM `@/lib/routes-builder`.
import { routesBuilder, resolvePath } from "@/lib/routes-builder";

export { resolvePath };

export const AppRoutes = routesBuilder({
  home: "/",
  log: "/log",
  history: "/history",
  dashboard: "/dashboard",
  settings: {
    path: "/settings",
    integrations: "/integrations",
  },
  login: "/login",
  share: {
    path: "/share",
    uid: {
      path: "/:uid",
    },
  },
});

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
});
