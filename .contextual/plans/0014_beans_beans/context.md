# Problem Statement

The app lacks a dedicated beans management experience. Beans are currently only accessible as a selector within the shot log form. Users need a first-class beans page for browsing, searching, deep-diving into individual beans, and comparing beans/shots side-by-side — similar to a product feature comparison matrix.

# Scope

## In Scope

- New top-level navigation structure: Menu [Profile, Tasting], Beans, Shots, Stats, Log
- `/beans` page: searchable list with table view (matching shots table patterns), sorting in both table and card view, grayed-out text for hidden beans
- `/beans/[id]` page: bean detail with breadcrumb (`/beans/{Name}`), bean info, Edit/Share buttons, shot comparison matrix
- Shot comparison on bean detail: select shots to compare side-by-side (up to 3), with shot types: Best rating, Reference, Shot number (non-hidden index), Typical (date range average), Average (date range)
- Bean comparison: select 2+ beans on `/beans` page to compare side-by-side
- `GET /api/beans/compare` endpoint: accepts bean IDs, returns enriched comparison data (shot stats, min/max/count shot numbers)
- Reusable `CompareItems` component: config-driven field comparison, up to 3 items, with item selector/deselect

## Out of Scope

- Bean creation/editing flow changes (existing `BeanFormModal` is sufficient)
- Changes to the shot logging flow
- Social/public sharing of bean comparisons
- Bean ratings or reviews (separate from shot ratings)

## Dependencies

- Existing: `src/components/beans/` (BeanSelector, BeanFormModal, hooks)
- Existing: `src/app/api/beans/` (CRUD endpoints, search)
- Existing: Shots table patterns in `src/app/(app)/shots/page.tsx` (Tanstack React Table, mobile card view)
- Existing: Navigation in `src/components/layout/` (Sidebar, NavBar, nav-items)
- Existing: `src/db/schema.ts` (beans, shots tables — no schema changes needed)
- Existing: `src/app/routes.ts` (AppRoutes, ApiRoutes)

# Solution

## Navigation

Update the nav structure to add Beans as a top-level item. The new order:

**Desktop sidebar (`desktopMainNav`)**: Log, Beans, Shots, Stats, Tasting
**Mobile bottom bar (`mobileMainTabs`)**: Beans, Shots, Stats, Add
**Mobile hamburger menu**: Profile, Tasting (plus existing Admin/Feedback/Sign Out)

Update `nav-items.ts` to add a `beans` entry pointing to the new `/beans` AppRoute.

## `/beans` Page — Bean List

A searchable, sortable list of the user's beans. Follows the shots page pattern using Tanstack React Table.

**Table columns**: Name, Roaster, Origin, Roast Level, Roast Date, Processing, Shot Count, Last Shot Date
**Card view (mobile)**: Bean name, roaster, roast level, roast date, shot count
**Sorting**: Available on all columns in both table and card view
**Search**: Text search filtering by name, roaster, origin
**Hidden beans**: Show all beans in the list. Beans where ALL shots are hidden (or bean has zero shots) display with grayed-out/muted text styling. No schema change needed — derived from shot `isHidden` status.
**Selection mode**: Multi-select beans to trigger comparison view (navigates to compare)

## `/beans/[id]` Page — Bean Detail

**Breadcrumb**: `Beans / {Bean Name}` at the top, linking back to `/beans`
**Bean info section**: All bean fields (name, origin, roaster, processing, roast level, roast date, open bag date, origin details)
**Actions**: Edit button (opens existing BeanFormModal), Share button

**Shot Comparison Matrix**: A comparison table where the user selects shots to compare side-by-side. Each column is a shot selection, each row is a parameter.

Shot selection types:
| Type | Description | Indexing |
|------|-------------|----------|
| Best Rating | Shot with highest rating | By time if >1 at same rating. Default to latest. |
| Reference | Shot marked as `isReferenceShot` | By time if >1. Default to latest. |
| Shot Number | Non-hidden shots indexed by time | 1, 2, 3, 4, 5... |
| Typical | Representative shot for a date range | Date range selector |
| Average | Computed average values for a date range | Date range selector |

**Comparison rows** (shot parameters): Dose, Yield, Ratio, Brew Time, Grind Level, Brew Temp, Pre-infusion, Pressure, Flow Rate, Quality, Rating, Bitter, Sour, Notes, Date

## Bean Comparison — `/beans/compare`

Accessed from the `/beans` list by selecting beans. Shows 2-3 beans side-by-side with their shot statistics.

**Display per bean**: Bean details + aggregated shot data (shot count, min/max shot numbers, best rating, average quality, date range of shots)

**Shot history**: Viewable by index (shot #1, #2, etc.) AND by offset since roast date.

## `GET /api/beans/compare` Endpoint

**Params**: `beanIds` (comma-separated UUIDs)
**Returns**:
```
{
  beans: [{
    id, name, origin, roaster, roastLevel, roastDate, ...beanFields,
    shotComparisons: {
      minShotNumber: number,
      maxShotNumber: number,
      shotCount: number,
      shots: Shot[]  // non-hidden shots for this bean
    }
  }]
}
```

**Deferred**: Multi-user comparison (comparing your shots vs another user's shots on the same bean) is out of scope for this iteration.

## `CompareItems` Component

A reusable comparison layout component.

**Props**:
- `config`: Array of `{ field: string, label: string, type: 'text' | 'number' | 'date' | 'rating' | 'tags' }` — defines rows
- `items`: Array of data objects (the columns)
- `maxItems`: Maximum items to compare (default 3)
- `itemSelector`: React node or render prop for selecting an item to add
- `itemDeselect`: Callback or render prop for removing an item

**Layout**: Vertical header column (field labels) + horizontal item columns. Responsive — stacks or scrolls on mobile.

**Highlighting**: Optionally highlight best/worst values per row for numeric fields.

# Tasks

## Phase 1: Foundation — Routes, Navigation & Data Hooks

- [x] Add `beans: { path: "/beans", beanId: { path: "/:id" }, compare: "/compare" }` to `AppRoutes` and `compare: { path: "/compare" }` under `ApiRoutes.beans` in `src/app/routes.ts`
- [x] Add `beans` entry to `navItems` in `src/components/layout/nav-items.ts`; update `desktopMainNav` to [add, beans, shots, stats, tasting]; update `mobileMainTabs` to [beans, shots, stats, add]
- [x] Add hooks in `src/components/beans/hooks.ts`: `useBeansList()` (returns beans with shot counts + hidden status via enriched GET), `useBean(id)` (single bean), `useBeanShots(beanId)` (shots for a bean)

## Phase 2: Bean List Page (`/beans`)

- [x] Create `src/app/(app)/beans/page.tsx` using Tanstack React Table (mirror shots page pattern): columns for Name, Roaster, Origin, Roast Level, Roast Date, Processing, Shot Count, Last Shot Date; global text search across name/roaster/origin; sorting on all columns
- [x] Add mobile card view (`BeanCard` component) with sorting support, matching shots card pattern (`md:hidden` / `hidden md:block` toggle)
- [x] Derive hidden-bean status (all shots hidden or zero shots) and apply `text-stone-400 dark:text-stone-600` muted styling; add multi-select mode for bean comparison (navigate to `/beans/compare?ids=...`)

## Phase 3: Bean Detail Page (`/beans/[id]`)

- [x] Create `src/app/(app)/beans/[id]/page.tsx` with breadcrumb (`Beans / {Name}` linking to `/beans`), bean info section (all fields), Edit button (reuse `BeanFormModal`), Share button; leverage existing `GET /api/stats/by-bean/:beanId` for aggregated stats
- [x] Build shot comparison matrix: shot selector with types (Best Rating, Reference, Shot Number, Typical, Average); comparison rows for all shot parameters; shot indexing by time and offset-since-roast-date

## Phase 4: Comparison Features

- [x] Build `CompareItems` component in `src/components/common/CompareItems.tsx` — config-driven rows, up to `maxItems` (default 3) columns, `itemSelector` render prop, `itemDeselect` callback, responsive layout (horizontal scroll on mobile), optional numeric highlighting
- [x] Create `GET /api/beans/compare` endpoint in `src/app/api/beans/compare/route.ts` — accepts `beanIds` param, returns beans with `shotComparisons` (shots[], shotCount, minShotNumber, maxShotNumber); add `useBeansCompare` hook
- [x] Create bean comparison page at `src/app/(app)/beans/compare/page.tsx` — reads `ids` from query params, uses `CompareItems` with bean fields config, includes shot history viewable by index and offset-since-roast
