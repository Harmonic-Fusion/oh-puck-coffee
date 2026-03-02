# Codebase Analysis — Beans Feature

## Navigation (`src/components/layout/nav-items.ts`)

- `navItems` object: named entries (admin, profile, tasting, shots, stats, add) with `{ label, href, icon }`
- `mobileMainTabs`: `[shots, stats, add]`
- `desktopMainNav`: `[add, stats, shots, tasting]`
- `getMobileMenuItems(role)`: admin (if super-admin), feedback, profile, tasting
- Active state: `isRouteActive(pathname, href)` — matches exact or startsWith

## Shots Table Pattern (`src/app/(app)/shots/page.tsx`, 1601 lines)

- Tanstack React Table with `createColumnHelper<ShotWithJoins>()`
- Plugins: core, sorted, filtered, pagination, faceted
- Custom filter fns: `multiSelectFilterFn`, `numericBucketFilterFn`, `dateRangeFilterFn`, `booleanFilterFn`
- Global search across multiple fields
- Desktop: full HTML table with sortable headers
- Mobile: card stack (`md:hidden` / `hidden md:block` toggle)
- Card: header (name, date, badges), 3-col grid (6 fields), notes, action bar
- Selection: `Set<string>` for multi-select IDs
- Default sort: `[{ id: "date", desc: true }]`

## Beans Hooks (`src/components/beans/hooks.ts`)

- `useBeans(search?)` → `["beans", search]` → `Bean[]`
- `useCreateBean()` → POST, invalidates `["beans"]`
- `useUpdateBean()` → PATCH `/:id`, invalidates `["beans"]`
- `useBeansSearch(search?, limit?)` → `["beans", "search", search, limit]` → `{ id, name }[]`

## Beans API

- `GET /api/beans`: search param, orderBy=recent (LEFT JOIN shots), role-based filter
- `GET /api/beans/:id`: single bean, validateMemberAccess
- `PATCH /api/beans/:id`: update with CreateBean schema
- `POST /api/beans`: create
- `GET /api/beans/search`: lightweight id+name results
- `GET /api/stats/by-bean/:beanId`: shotCount, avgQuality, avgRating, avgBrewRatio, avgBrewTime, avgGrindLevel, commonFlavors

## Bean Schema (`src/shared/beans/schema.ts`)

- `beanSchema`: id, name, origin, roaster, originId, roasterId, originDetails, processingMethod, roastLevel, roastDate, openBagDate, isRoastDateBestGuess, userId, createdAt
- `createBeanSchema`: validated subset for create/update
- Constants: `ROAST_LEVELS`, `PROCESSING_METHODS`

## Route Builder (`src/lib/routes-builder.ts`)

- `resolvePath(route, { paramName: value })` for dynamic segments
- Nested routes: `beans: { path: "/beans", beanId: { path: "/:id" } }`

## Reusable Components

- `SearchableSelect` — dropdown with search, add-new, deselect
- `Modal` — overlay modal with header/footer/side slots
- `ComboboxInput` — autocomplete input
- `ui/` — badge, button, dropdown-menu, table, input, select, checkbox, popover, separator
- `BeanFormModal` — exported from BeanSelector, reusable for create/edit

## Existing Stats Endpoint

- `GET /api/stats/by-bean/:beanId` already returns comprehensive bean stats — can be leveraged for bean detail page

## Files to Create

- `src/app/(app)/beans/page.tsx`
- `src/app/(app)/beans/[id]/page.tsx`
- `src/app/api/beans/compare/route.ts`
- `src/components/common/CompareItems.tsx`

## Files to Modify

- `src/app/routes.ts` — add AppRoutes.beans (with beanId, compare), ApiRoutes.beans.compare
- `src/components/layout/nav-items.ts` — add beans nav item, update arrays
- `src/components/beans/hooks.ts` — add useBean, useBeanShots, useBeansCompare hooks
