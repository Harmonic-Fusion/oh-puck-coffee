# Problem Statement

The shot history page is functional but has a basic UI, limited filtering, minimal tasting data display on cards, a Shot Detail modal that doesn't mirror the form's section structure, no computed metrics, no swipe navigation, and the nav label still says "History" rather than the more accurate "Shots." This plan overhauls the entire history experience to be richer, more filterable, and more consistent.

# Scope

## Requirements

1. **Nav rename**: Change all nav/menu references from "History" to "Shots" (NavBar, Sidebar, UserDropdown, page title).
2. **Shot Card enhancements**: Display per-line tasting data (body/texture, flavors, adjectives) and bitter/sour fields on the mobile card.
3. **Shot Card actions**: Replace the bottom text buttons with wider icon-only buttons with hover tooltips: Reference, Hide, Duplicate, Share, Select.
4. **Select mode + bulk actions**: When selecting shots, replace the filter bar with a selection action bar (Deselect, Delete, Hide/Reveal with mixed-mode handling — if mixed, first action hides all; if all hidden, reveals all).
5. **Shot Detail sections**: Reorganize into Setup, Recipe, Results, Tasting sections to match the ShotForm (`SectionBasics`, `SectionRecipe`, `SectionResults`).
6. **FilterBar overhaul**: Build a new sticky horizontal-scroll filter bar component with filter chips. Each chip shows the filter name + active-count badge. Clicking a chip opens a modal to edit that filter.
   - **Mobile behavior**: Sticky top bar that appears on scroll-up and hides on scroll-down.
   - **Filters**: Beans, DateRange, Rating (1–5, where e.g. "2" includes 1.5–2.4), Hidden, Reference, Grinder, Machine, Flavors, Body, Adjectives, Tools, Bitter Range (1–5), Sour Range (1–5), Shot Quality (1–5), Ratio buckets (1:1, 1:2, 1:3, 1:4, 1:5+).
7. **Shot Detail — Metrics section**: New section showing computed analytics:
   - Yield accuracy: `abs(yieldActualGrams - yieldGrams) / yieldGrams` as a percentage.
   - Rating distribution: histogram of previous shots' ratings + indicator for current shot.
8. **Shot Detail — Metrics API**: New `GET /api/stats/shot-metrics?shotId=:id` endpoint returning the computed metrics for a given shot.
9. **Shot Detail — Swipe navigation**: Swipe left/right (touch + keyboard arrows) to move between the previous/next shot in the current filtered list.
10. **Shared Shot Detail reuse**: Use the same ShotDetail component (read-only mode) on the `/share/:uid` page, replacing `SharedShotView`.
11. **Data Table architecture refactor**: Replace the manual desktop table rendering in `ShotTable.tsx` and the 1500-line `FilterBar.tsx` with a reusable component architecture built on shadcn primitives + TanStack Table. Build a generic `data-table/` component layer (shell, faceted filters, column headers, pagination, view options) that can be reused across any future table in the app. Replace the shot-specific `csv-export.ts` with a generic `export-csv.ts` utility integrated into the toolbar.

## Boundaries

- No database schema changes required. All new filters are client-side or use existing API query params (with new ones added).
- The metrics endpoint is read-only; no new writes.
- Desktop table columns remain unchanged; card-only improvements for mobile.
- The filter bar API params will be extended (new query params on `GET /api/shots`): `isHidden`, `isReferenceShot`, `grinderId`, `machineId`, `ratingMin`, `ratingMax`, `bitterMin`, `bitterMax`, `sourMin`, `sourMax`, `shotQualityMin`, `shotQualityMax`, `flavors`, `bodyTexture`, `adjectives`, `toolsUsed`, `ratioMin`, `ratioMax`.
- Phase 8 introduces shadcn as a new dependency layer. The `data-table/` components are copy-owned — no upstream shadcn dependency after generation. Mobile `ShotCard` layout is preserved as-is (the refactor targets the desktop table and toolbar only).

## Dependencies

- Existing components: `ShotFilters`, `ShotCard`, `ShotTable`, `ShotDetail`, `SharedShotView`, `NavBar`, `Sidebar`, `UserDropdown`.
- Existing hooks: `useShots`, `useShot`, `useToggleReference`, `useToggleHidden`, `useDeleteShot`, `useCreateShareLink`.
- Existing API: `GET /api/shots`, `GET /api/shots/[id]`.
- TanStack Table v8 (`@tanstack/react-table` — already installed).
- `@heroicons/react` v2 (already installed — all data-table icons use `@heroicons/react/16/solid`).
- Flavor wheel data/colors (already imported in multiple components).
- **Phase 8 new deps**: shadcn CLI + primitives (table, badge, button, command, popover, separator, input, dropdown-menu, select, checkbox). Requires `components.json` init, `cn` utility (`clsx` + `tailwind-merge`), and `src/components/ui/` directory. Tailwind CSS v4 is in use (`@tailwindcss/postcss`) — shadcn init must target the v4 config.

# Solution

The work is organized into 8 phases, progressing from trivial renames through UI enhancements, filter infrastructure, metrics, navigation, component unification, and finally a full table architecture refactor.

**Why this approach:**
- Phased delivery allows each change to be independently testable and shippable.
- Filter bar is the most complex piece — isolated in its own phase with both client-side logic and API param extensions.
- Metrics requires a new API endpoint, so it's separated from UI-only work.
- Swipe navigation and Share page reuse are additive and can be done last without blocking earlier phases.
- The Shot Detail section reorganization is done early (Phase 3) so the shared component is ready before the Share page integration (Phase 7).
- Phase 8 refactors the table, toolbar, and export into a reusable component architecture using shadcn primitives + TanStack Table. It's last because it restructures code from Phases 2–5 into a more maintainable pattern — the earlier phases establish *what* the UI should do, Phase 8 establishes *how* it's architected. This avoids doing two things at once (features vs. architecture) and ensures the refactor has stable requirements to target.

# Tasks

## Phase 1: Nav Rename & Page Title

- [x] Rename "History" → "Shots" in `NavBar` (`src/components/layout/NavBar.tsx` line 16), `Sidebar` (`src/components/layout/Sidebar.tsx` line 185), `UserDropdown` (`src/components/landing/UserDropdown.tsx` line 71), and page heading in `src/app/(app)/history/page.tsx` (lines 114–119).

## Phase 2: Shot Card Enhancements

- [x] Add tasting data rows to `ShotCard` in `src/components/shots/log/ShotTable.tsx`: body/texture as labeled `SelectedBadges`, flavors (already partially shown — add labels), adjectives line, and bitter/sour color-coded indicators (reuse `interpolateColor`/`getBitterColor`/`getSourColor` — extract to a shared util or import from `ShotDetail`).
- [x] Replace `ShotCard` bottom text-button bar with 5 wider icon-only buttons (Reference ⭐, Hide 👁, Duplicate 📋, Share 🔗, Select ☑) with `title` tooltips. Add `onDuplicate`, `onShare`, `onSelect` callback props. Wire through `ShotTable` → history page. Duplicate navigates to `/log` with query params (reuse `ShotDetail.handleDuplicate` logic). Share creates a share link + copies/opens share dialog. Select toggles the card in `selectedIds` state.

## Phase 3: Shot Detail Reorganization

- [x] Restructure `ShotDetail` (`src/components/shots/log/ShotDetail.tsx`) modal body from flat layout into four collapsible sections mirroring the form: **Setup** (bean name, roast level, grinder, machine, days post roast), **Recipe** (dose, target yield + ratio, grind level, brew temp, pre-infusion, brew pressure, tools used), **Results** (actual yield + actual ratio, brew time + flow rate, est. max pressure), **Tasting** (shot quality, rating, bitter, sour, body, flavors, adjectives, notes). Reuse `h3` uppercase tracking-wide section headers. Keep QR code and footer buttons unchanged. Add a `readOnly` prop that hides edit/action buttons (needed for Phase 7 Share page reuse).

## Phase 4: Select Mode & Bulk Actions

- [x] Add `isSelecting` boolean + `selectedIds: Set<string>` state to history page. When `isSelecting=true`: (a) show checkbox overlay on each `ShotCard`, (b) replace the filter/header bar with a selection action bar (count badge, Deselect All, Delete Selected with confirm, Hide/Reveal Selected). For Hide/Reveal: if any selected shot has `isHidden=false` → label "Hide All" and set all to hidden; if all selected have `isHidden=true` → label "Reveal All" and set all to visible. Wire through existing `handleBulkDelete` and a new `handleBulkSetHidden(ids, hidden: boolean)` that calls the hide endpoint for each. Desktop table already has checkbox selection via TanStack Table — unify the `rowSelection` state with `selectedIds`.

## Phase 5: FilterBar Component & API Extensions

- [x] Create `FilterBar` component (`src/components/shots/log/FilterBar.tsx`): horizontal-scroll container with filter chips. Each chip renders the filter name + a badge showing active selection count. Clicking a chip opens a popover/modal to edit that filter. Filters: **Beans** (multi-select from `useBeans`), **Date** (from/to date pickers), **Rating** (checkboxes 1–5, where "2" matches 1.5–2.4), **Hidden** (toggle Yes/No/All), **Reference** (toggle), **Grinder** (multi-select from `useGrinders`), **Machine** (multi-select from `useMachines`), **Flavors** (multi-select from `FLAVOR_WHEEL_DATA`), **Body** (multi-select), **Adjectives** (multi-select), **Tools** (multi-select from `useTools`), **Bitter** (min/max 1–5), **Sour** (min/max 1–5), **Shot Quality** (checkboxes 1–5), **Ratio** (buckets: 1:1, 1:2, 1:3, 1:4, 1:5+). Mobile: sticky top bar that shows on scroll-up, hides on scroll-down (track `window.scrollY` delta via `useRef`). Replace `ShotFilters` in history page with `FilterBar`.
- [x] Extend `GET /api/shots` (`src/app/api/shots/route.ts`) to accept new query params: `isHidden` (boolean), `isReferenceShot` (boolean), `grinderId`, `machineId`, `ratingMin`/`ratingMax`, `bitterMin`/`bitterMax`, `sourMin`/`sourMax`, `shotQualityMin`/`shotQualityMax`, `flavors` (comma-sep, filter shots whose `flavors` jsonb array overlaps), `bodyTexture` (comma-sep), `adjectives` (comma-sep), `toolsUsed` (comma-sep), `ratioMin`/`ratioMax` (applied post-query on computed `brewRatio`). Update `ShotsQueryParams` interface and `useShots` hook in `src/components/shots/hooks.ts` to pass all new params.

## Phase 6: Shot Detail Metrics

- [x] Add route `stats.shotMetrics: "/shot-metrics"` under `stats` in `src/app/routes.ts`. Create `GET /api/stats/shot-metrics` (`src/app/api/stats/shot-metrics/route.ts`) accepting `?shotId=:id`. Returns: `{ yieldAccuracyPct: number | null, ratingDistribution: { rating: number, count: number }[], currentShotRating: number | null }`. Yield accuracy = `100 * abs(yieldActual - yieldTarget) / yieldTarget`. Rating distribution = histogram of all user's non-hidden shots grouped by `Math.floor(rating)`. Create `useShotMetrics(shotId)` hook. Add "Metrics" section to `ShotDetail` (below Results, above Tasting): yield accuracy as a percentage badge (green ≤5%, yellow ≤15%, red >15%), rating distribution as a simple horizontal bar chart with the current shot's rating highlighted.

## Phase 7: Swipe Navigation & Share Page Reuse

- [x] Add `shots?: ShotWithJoins[]` and `currentIndex?: number` props to `ShotDetail`. When provided, render left/right chevron buttons in the modal header and implement touch swipe (track `touchstart`/`touchend` X delta ≥50px) + keyboard `ArrowLeft`/`ArrowRight` handlers to navigate. Update history page to pass the filtered `shots` array and compute `currentIndex` from `selectedShot`. Wrap navigation in `useCallback` to avoid re-renders.
- [x] Refactor `SharedShotView` (`src/components/shots/SharedShotView.tsx`) to render `ShotDetail` with `readOnly={true}` (no footer buttons, no edit mode, no QR code). Update `src/app/share/[uid]/page.tsx` to pass the shot data through the `ShotDetail` component. The share page is a server component — it will fetch data server-side and pass as props to a thin client wrapper that renders `ShotDetail` in read-only mode. Remove `SharedShotView` once replaced.

## Phase 8: TanStack Table + shadcn Data Table Refactor

Replaces the manual desktop table rendering in `ShotTable.tsx` (737 lines), the monolithic `FilterBar.tsx` (1516 lines), and the shot-specific `csv-export.ts` (113 lines) with a reusable, composable architecture. The generic `data-table/` components are fully reusable for any future table in the app.

**Target file structure:**
```
src/components/data-table/
  data-table.tsx                ← generic table shell (columns + data + toolbar render prop)
  data-table-toolbar.tsx        ← template toolbar (copy per feature)
  data-table-faceted-filter.tsx ← reusable faceted checkbox popover
  data-table-column-header.tsx  ← sortable column headers with hide option
  data-table-pagination.tsx     ← page size + navigation controls
  data-table-view-options.tsx   ← column visibility toggle
src/components/shots/log/
  shot-columns.tsx              ← shot-specific ColumnDef<ShotWithJoins>[]
  shot-table-toolbar.tsx        ← shot-specific toolbar wiring faceted filters
src/lib/export-csv.ts           ← generic CSV export utility (replaces csv-export.ts)
```

### Step 1: shadcn Foundation

- [x] Initialize shadcn: run `npx shadcn@latest init` to create `components.json`, `src/lib/utils.ts` (with `cn` helper using `clsx` + `tailwind-merge`), and `src/components/ui/` directory. Ensure Tailwind CSS v4 compatibility (`@tailwindcss/postcss` is in use — shadcn init must detect or be configured for v4).
- [x] Install required shadcn primitives: `npx shadcn@latest add table badge button command popover separator input dropdown-menu select checkbox`. Some may already exist as custom components in `src/components/common/` — shadcn components go in `src/components/ui/` and coexist; existing common components are not replaced.

### Step 2: Generic Data Table Components

- [x] Create `src/components/data-table/data-table.tsx`: generic `DataTable<TData, TValue>` component accepting `columns: ColumnDef[]`, `data: TData[]`, and `toolbar?: (table) => ReactNode` render prop. Internally manages `SortingState`, `ColumnFiltersState`, `VisibilityState`, `RowSelectionState`, and `globalFilter` state. Uses `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `getFacetedRowModel`, `getFacetedUniqueValues` from TanStack Table. Renders using shadcn `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`/`TableHead`. Includes `DataTablePagination` at bottom.
- [x] Create `src/components/data-table/data-table-faceted-filter.tsx`: generic `DataTableFacetedFilter<TData, TValue>` component accepting `column`, `title`, and `options: FacetedFilterOption[]`. Uses Popover + Command (combobox) pattern. Shows unique value counts via `column.getFacetedUniqueValues()`. Selected values rendered as Badge pills. Supports multi-select with "Clear filters" action. All icons from `@heroicons/react/16/solid`.
- [x] Create `src/components/data-table/data-table-column-header.tsx`: generic `DataTableColumnHeader<TData, TValue>` with sort toggle (Asc/Desc) and column hide option via DropdownMenu. Icons: `ArrowUpIcon`, `ArrowDownIcon`, `ChevronUpDownIcon`, `EyeSlashIcon` from `@heroicons/react/16/solid`.
- [x] Create `src/components/data-table/data-table-pagination.tsx`: generic `DataTablePagination<TData>` with page size selector (10/20/30/40/50 via Select), page indicator, and first/prev/next/last navigation buttons. Shows selected row count and filtered row count. Icons: `ChevronLeftIcon`, `ChevronRightIcon`, `ChevronDoubleLeftIcon`, `ChevronDoubleRightIcon` from `@heroicons/react/16/solid`.
- [x] Create `src/components/data-table/data-table-view-options.tsx`: generic `DataTableViewOptions<TData>` with DropdownMenu of checkbox items for toggling column visibility. Only shows columns with `accessorFn` and `getCanHide()`. Icon: `AdjustmentsHorizontalIcon` from `@heroicons/react/16/solid`.

### Step 3: Generic CSV Export

- [x] Create `src/lib/export-csv.ts`: generic `exportToCsv<TData>(filename, rows, columns: { id, header }[])` function. Handles comma/quote escaping. Creates a Blob download. This is table-agnostic — it exports whatever rows and columns are passed. The existing `src/lib/csv-export.ts` (shot-specific) is preserved for now and removed in Step 5 cleanup.

### Step 4: Shot-Specific Column Definitions & Toolbar

- [x] Create `src/components/shots/log/shot-columns.tsx`: define `ColumnDef<ShotWithJoins>[]` with all current table columns (select checkbox, bean name, dose, yield, grind, brew time, shot quality, rating). Use `DataTableColumnHeader` for sortable headers. Set `filterFn: 'arrIncludes'` on all columns that will have faceted filters (bean name, grinder, machine, rating, shot quality, etc.). Add checkbox selection column (`enableSorting: false`, `enableHiding: false`).
- [x] Create `src/components/shots/log/shot-table-toolbar.tsx`: shot-specific `ShotTableToolbar` component. Wires up global search input + `DataTableFacetedFilter` instances for each filterable column (Beans, Rating, Shot Quality, Grinder, Machine, Hidden, Reference, Flavors, Body, Adjectives, Tools). Includes reset button (visible when filters are active) and `DataTableViewOptions`. Includes Export CSV button that calls `exportToCsv` with `table.getFilteredRowModel().rows` and visible columns. Define all filter option arrays as module-level constants outside the component.

### Step 5: Integration & Cleanup

- [x] Update `src/components/shots/log/ShotTable.tsx`: replace the desktop table rendering (`<div className="hidden ... md:block">` section) with `<DataTable columns={shotColumns} data={data} toolbar={(table) => <ShotTableToolbar table={table} />} />`. Preserve the mobile `ShotCard` layout (`<div className="flex flex-col gap-3 md:hidden">`) as-is — it renders independently above the `DataTable`. Remove the manual `useReactTable` call, column definitions, and header/body rendering from `ShotTable`. The `ShotTable` component becomes a thin wrapper: mobile cards + `DataTable` for desktop.
- [x] Update `src/app/(app)/history/page.tsx`: remove the standalone Export CSV button from the page header (it moves into the toolbar). Remove the custom `FilterBar` import — filtering is now handled by the toolbar's faceted filters + global search within `DataTable`. Preserve select mode / bulk action bar as-is (it replaces the toolbar when `isSelecting=true`). Wire the `DataTable`'s row selection state to `selectedIds`.
- [x] Remove `src/components/shots/log/FilterBar.tsx` (1516 lines) — fully replaced by `ShotTableToolbar` + `DataTableFacetedFilter`. Remove `src/lib/csv-export.ts` (113 lines) — fully replaced by generic `src/lib/export-csv.ts`. Clean up any orphaned imports.

## Phase 9: Card View Pagination & Filter Bar Integration

**Research Decision: Card View Architecture**

After reviewing shadcn/ui and TanStack Table patterns, **using TanStack Table's row model to drive the card view is the recommended approach** rather than creating a separate shadcn card view component. Justification:

1. **Filter consistency**: The existing `ShotTableToolbar` and `DataTableFacetedFilter` components are built on TanStack Table's column filter API. By creating a TanStack Table instance for the card view (even without rendering a table), we can reuse the exact same filter components and logic, ensuring desktop and mobile filtering stay in sync.

2. **Single source of truth**: TanStack Table manages sorting, filtering, pagination, and selection state. Using it for both views means both desktop table and mobile cards operate on the same filtered/sorted dataset, preventing inconsistencies.

3. **No shadcn card view exists**: shadcn/ui doesn't provide a built-in "card view" component for data tables. Their table components are designed to work with TanStack Table's row model. Creating a custom card view that consumes TanStack Table's row model is the standard pattern.

4. **Performance**: TanStack Table's pagination model (`getPaginationRowModel`) provides built-in page size management. For infinite scroll, we can use `getPaginationRowModel` with a page size of 20 and implement Intersection Observer to load the next page when the user scrolls near the bottom.

5. **Code reuse**: The `ShotTableToolbar` component can be reused for the card view by passing the same table instance. This eliminates duplicate filter UI code.

**Implementation approach:**
- Create a TanStack Table instance in `ShotTable` that manages state for both desktop table and mobile cards
- Use `table.getRowModel().rows` to render cards (instead of directly mapping `data`)
- Implement infinite scroll using Intersection Observer on a sentinel element at the bottom of the card list
- When scroll threshold is reached, increment the table's page size (or use `getPaginationRowModel` with manual page management)
- Render `ShotTableToolbar` above the card view on mobile (hidden on desktop where `DataTable` renders its own toolbar)
- Ensure the toolbar's filters apply to both views via the shared table instance

### Tasks

- [x] Update `ShotTable` component to create a shared TanStack Table instance that drives both desktop table and mobile card views. Use `table.getRowModel().rows` instead of directly mapping `data` for card rendering. The table instance should manage sorting, filtering, and pagination state that applies to both views.
- [x] Implement infinite scroll for mobile card view: Add an Intersection Observer that watches a sentinel element at the bottom of the card list. When the sentinel enters the viewport, increment the visible card count (start with 20, load 20 more per scroll). Use `useState` to track `visibleCount` and slice `table.getRowModel().rows` to `visibleCount` items. Reset `visibleCount` when filters change.
- [x] Add `ShotTableToolbar` above the mobile card view (`<div className="md:hidden mb-4">`). Pass the shared table instance to the toolbar. The toolbar should render the same filter components (`DataTableFacetedFilter`) that work for the desktop table, ensuring filter state is shared between views. Hide the toolbar when `isSelecting=true` (selection action bar takes precedence).
- [x] Ensure filter state synchronization: When filters are applied via the mobile toolbar, the desktop table should reflect the same filters (and vice versa). This is automatic since both views use the same table instance, but verify that the `DataTable` component in desktop view receives the same table instance or shares the same state.
- [x] Add loading state for infinite scroll: When the Intersection Observer triggers, show a subtle loading indicator (skeleton cards or spinner) while the next batch of cards renders. Reset to 20 visible cards when filters/sorting change.
- [x] Test performance with large datasets: Verify that rendering 20+ cards doesn't cause performance issues. Consider using `React.memo` on `ShotCard` if re-renders become expensive. Ensure the Intersection Observer cleanup properly on unmount.
