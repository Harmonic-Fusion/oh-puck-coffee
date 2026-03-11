# Problem Statement

Several fixes are needed: list/card sorting on `/beans` and `/shots`, filter UI visibility and multi-select semantics, a runtime module error on `/stats`, mobile filter scroll behavior, and reliable saving of Roaster/Origin when editing beans.

# Scope

- **Sorting on cards**: On `/beans` and `/shots`, the mobile card view must respect the same sort order as the desktop table (and the sort bar). Currently sorting does not apply correctly to the cards.
- **Filter state visibility and multi-select**: On `/beans` and `/shots`, the filter controls (roaster, origin, roast, process, date, etc.) must visibly show the current selection (what is selected). Multiple selections per dimension (e.g. multiple roasters, multiple origins) must be supported and combined with AND logic (e.g. Roaster A AND Origin B).
- **Stats page module error**: The `/stats` page can throw a runtime error: "Module … was instantiated because it was required from module … but the module factory is not available." This must be fixed so the page loads reliably (likely chunk/barrel/dynamic import or circular dependency).
- **Mobile filter scroll**: Filter bars (beans and shots) on mobile must be horizontally scrollable without showing a visible scrollbar (overflow scroll, hide scrollbar).
- **Bean edit Roaster/Origin**: Saving a bean on edit (e.g. from `/beans/[id]` or from bean selector edit) must correctly persist Roaster and Origin. The app sends `origin` and `roaster` as strings; the database stores `originId` and `roasterId` (FKs to `origins` and `roasters`). The API must resolve string values to IDs (select existing or create) and set `originId`/`roasterId` so edits are saved correctly. The UI should support selecting from existing options or adding new Roaster/Origin (current Combobox-style behavior is acceptable; persistence is the fix).

# Solution

- **Sorting for cards**: Ensure the data source for the card view on both pages is the table’s fully processed row model (after sorting and filtering), e.g. `table.getFilteredRowModel().rows` where the table pipeline is core → sorted → filtered (and optionally paginated). If the pipeline order or the source used for cards does not include sorting, fix the pipeline or the card data source so cards and table (and mobile sort bar) stay in sync.
- **Filter visibility and AND multi-select**: Drive filter UI from table column filter state. Show active filters in the filter bar (e.g. pills or labels for "Roaster: Onyx", "Origin: Ethiopia"). Support multiple values per column (e.g. multi-select for roaster, origin, roast, process); apply filters with AND across columns. Reuse or extend existing TanStack Table column filter state and filter functions to support array values and AND logic where needed.
- **Stats module error**: Inspect `/stats` page and its imports (stats components, hooks, date-range-picker, etc.) for circular dependencies, barrel re-exports that pull in heavy or optional code, and dynamic imports. Fix by breaking cycles, inlining or direct imports, or ensuring dynamic chunks are loaded so the module factory is available when required.
- **Mobile filter scroll**: On the beans and shots filter bars, use a horizontal scroll container with overflow-x auto/scroll and CSS to hide the scrollbar (e.g. `scrollbar-width: none`, `-webkit-overflow-scrolling: touch`) so filters remain scrollable on small screens without a visible scrollbar.
- **Bean Roaster/Origin persistence**: In `PATCH /api/beans/[id]`, when the request body includes `origin` or `roaster` (strings), resolve each to an ID: look up in `origins`/`roasters` by name; if missing, insert and use the new id. Then update the bean row with `originId` and `roasterId` only (do not set non-existent `origin`/`roaster` columns on `beans`). Ensure GET responses continue to expose origin/roaster names (via join or lookup) for the UI. Apply the same resolution logic in `POST /api/beans` for create if it accepts origin/roaster strings.

# Tasks

## Phase 1: Sorting and filter data source

- [x] **Cards use sorted+filtered rows**: On `/beans` and `/shots`, verify the table pipeline order (core → sorted → filtered → paginated) and that the variable used for rendering mobile cards (e.g. `filteredRows`) is derived from the table’s row model after sorting. If cards use a different source (e.g. raw data), switch to the table’s processed row model so card order matches the sort bar and table.
- [x] **Filter bar shows active selection**: On `/beans` and `/shots`, surface current column filter state in the filter bar (e.g. which roaster(s), origin(s), roast level(s), process, date range are applied). User can see at a glance what is selected.
- [x] **Multi-value filters with AND**: Extend column filters to allow multiple values per column (e.g. multiple roasters, multiple origins). Rows must match all selected values for that column (e.g. roaster in [A, B] can be implemented as OR within column; across columns use AND). Update filter state shape and filter functions accordingly; ensure filter UI supports multi-select (e.g. pills, dropdown multi-select, or checkboxes).

## Phase 2: Stats page and mobile filter UX

- [x] **Fix stats page module error**: Reproduce or infer the "module factory is not available" error on `/stats` (e.g. dev build, production build). Fix by removing circular dependencies, replacing barrel imports with direct component imports, or adjusting dynamic imports so the stats page and its chart/hook dependencies load without missing factory.
- [x] **Horizontal scroll without scrollbar (mobile)**: On beans and shots pages, make the filter bar horizontally scrollable on mobile and hide the scrollbar via CSS while keeping touch scroll and keyboard scroll usable.

## Phase 3: Bean edit Roaster/Origin persistence

- [x] **Resolve origin/roaster to IDs in PATCH beans**: In `PATCH /api/beans/[id]`, accept `origin` and `roaster` strings from the body; for each, find or create the corresponding row in `origins`/`roasters` and set `originId`/`roasterId` on the bean. Do not pass through `origin`/`roaster` to `db.update(beans).set(...)`.
- [x] **Resolve origin/roaster in POST beans (create)**: In `POST /api/beans`, apply the same resolve-by-name (or create) logic for `origin` and `roaster` so new beans get correct `originId`/`roasterId`.
- [x] **Bean edit UI**: Ensure bean edit flows (detail page and bean selector modal) send `origin` and `roaster` strings (select-from-suggestions or free text); no change required if they already do, except that persistence will work after the API fix.
