# Problem Statement

The dashboard (stats) page needs targeted improvements: missing stat cards, a broken shot activity heatmap, chart additions/removals, and a redesigned filter bar. Both the dashboard and history (/shots) pages need a shared sticky filter bar with a new modal-based selection UI that works well on mobile and desktop.

# Plan summary (max 10 tasks)

1. Overview API + `OverviewStats` + six stat cards on `/stats`.
2. `ShotHeatmap`: local-date keys, auto-scroll to newest weeks, legend outside horizontal scroll.
3. **Shared flavor stats module** + refactor `FlavorRatingsChart` to import it (see Standardization below).
4. `FlavorBubbleChart` (`ChartContainer` + `ScatterChart`) replacing `TopFlavorsChart`; remove `ShotQualityChart` + `FlavorProfileChart`.
5. `DialInChart`: rating line + secondary right Y-axis (0–5).
6. `useFilterParams` (URL-backed date + beans).
7. `StickyFilterBar` (mobile scroll-reveal, desktop sticky, modal pickers).
8. Wire `/stats` to (6) + (7).
9. Wire `/shots` + `ShotsListView`: fetch with filter params; remove TanStack `FilterBar` and column filters.
10. Optional polish: extract `ToggleGroup` to `components/ui`; shared Recharts dark tooltip + `ChartContainer` migration for remaining stats charts (see ChartContainer deep dive).

# ChartContainer deep dive (`src/components/common/ChartContainer.tsx`)

Only **`FlavorRatingsChart`** and **`ParameterRatingChart`** use `ChartContainer` today. Most of `src/components/stats/*` duplicate the same **card shell** (`rounded-xl border … p-5`), title (`h3`), and empty states manually.

## What it already standardizes

| Concern | Behavior |
|--------|----------|
| **Card chrome** | Border, padding, dark mode, header border-bottom |
| **Title + description** | Optional helper text under the title; description swaps to skeleton when `isLoading` |
| **`isLoading`** | Chart area skeleton + controller skeletons (not a generic `Suspense` — explicit prop) |
| **`showNoData` + `noDataOverlay`** | Centered empty message with `minHeight: chartHeight`; avoids one-off `h-64` empty boxes |
| **`ResponsiveContainer`** | Single `chartHeight` prop (default 300) for Recharts |
| **`controllers`** | Rendered **below the title row**, **above** the chart (border-b). Used for **filters that are not the X-axis metric** (e.g. wheel-depth `ToggleGroup` in `FlavorRatingsChart`). Skeleton replaces this row when loading. |
| **`xController`** | Rendered **below** the chart area, **centered** — intended for **what maps to the horizontal axis** (docstring: *"X-axis metric or parameter selector"*). **`FlavorRatingsChart`**: `MetricSelector` (Count vs Ratings). **`ParameterRatingChart`**: `ParameterSelector` (which parameter is on X). This is the right slot for **X-axis selection** UX consistency across charts. |
| **`footer`** | Optional footnote row (border-t, small text) |

## Gaps / follow-ups (non-blocking)

- **Typo:** `xController` wrapper uses `className="mt-2 font-xl flex justify-center"` — `font-xl` is not a standard Tailwind size; likely a mistake (fix during implementation).
- **Heatmap:** Not a Recharts `ResponsiveContainer` child — may stay a custom card or use `ChartContainer` with `children` = non-Recharts content (still get title/description/loading if desired).

## What else to standardize via ChartContainer

1. **`DialInChart`** — Bean `<select>` today sits in the **header flex next to the title**; move to **`controllers`** (row under title) or **`xController`** (below chart) so the **dial-in axis** (bean choice) matches the **parameter vs rating** pattern on `/shots`. Prefer **`controllers`** if it’s “which bean series,” **`xController`** if the team interprets bean as driving the **horizontal** dimension of the line chart (shot index is already on X — so bean is really a **series filter**, so **`controllers`** is the better fit).
2. **`BeanAgeChart`**, **`BeanComparisonTable`** (chart header only if split), **remaining Recharts** in stats — migrate to `ChartContainer` + `showNoData` for consistent empty/loading UX.
3. **Shared “chart select” styling** — `MetricSelector` and `DialInChart`’s `<select>` both use `rounded-lg border border-stone-200 … text-xs`; extract **`ChartToolbarSelect`** (or document as pattern) so X-axis and filter dropdowns look identical.
4. **Tooltip** — Still duplicated; optional `chart-tooltip-styles.ts` (already in optional tasks).

## X-axis selection pattern (summary)

- **Below chart:** Use **`xController`** when the control **changes the meaning of the X dimension** (e.g. Count vs Ratings on the bar’s horizontal scale; which parameter is on X for scatter).
- **Above chart:** Use **`controllers`** for **filters** that narrow data **without** redefining the axis label (depth, bean family, etc.).

# Standardization (from `FlavorRatingsChart.tsx`)

`src/app/(app)/beans/[id]/__components__/FlavorRatingsChart.tsx` already implements patterns the dashboard flavor work should **reuse**, not duplicate.

## What to extract

| Piece | Location today | Proposed home |
|--------|----------------|---------------|
| **`aggregateFlavorStatsFromShots`** | Private inside `FlavorRatingsChart` | `src/lib/flavor-stats.ts` (or `src/shared/stats/flavor-stats.ts`) — **single source** for `{ flavor, avgRating, count }[]` from `ShotWithJoins[]` |
| **`FLAVOR_DEPTH_CACHE` / `buildFlavorDepthCache`** | Private in same file | Same module as small helpers, **or** `src/lib/flavor-wheel-depth.ts` importing `FLAVOR_WHEEL_DATA` |
| **`ToggleGroup`** | Private in `FlavorRatingsChart` | `src/components/ui/ToggleGroup.tsx` if reused by bubble chart (e.g. depth toggles) or elsewhere |
| **Chart chrome** | `FlavorRatingsChart` uses **`ChartContainer`** | **`FlavorBubbleChart` must use `ChartContainer`** (`src/components/common/ChartContainer.tsx`) for title, description, loading, and empty states — match bean page charts instead of ad-hoc `rounded-xl border` wrappers used by older stats charts |
| **Recharts tooltip dark theme** | Inline `contentStyle` object repeated across charts | Optional: `src/components/common/chart-tooltip-styles.ts` exporting one `const` for Tooltip `contentStyle` |

## Rating semantics (align with API)

- **`GET /api/stats/flavors`** and **`FlavorRatingsChart`** only count a shot when **`rating` is present** (skip null).
- **`TopFlavorsChart`** used `rating ?? shotQuality` — **inconsistent**.
- **Decision:** Shared `aggregateFlavorStatsFromShots` should match **API + `FlavorRatingsChart`**: require non-null `rating` for inclusion (document in JSDoc). `FlavorBubbleChart` consumes the same helper so dashboard and bean page stay aligned.

## What stays chart-specific

- **Bar vs scatter:** `FlavorRatingsChart` remains a vertical `BarChart`; `FlavorBubbleChart` is a `ScatterChart` — only the **data pipeline** is shared.
- **Depth UI:** Wheel-depth toggles are required on the bean page chart; **optional** on the dashboard bubble chart (spec: omit depth toggles on dashboard unless product asks for parity — keeps dashboard simpler).

## Refactor order

1. Add `src/lib/flavor-stats.ts` with exported `aggregateFlavorStatsFromShots` (+ depth cache if colocated).
2. Replace the inline function in `FlavorRatingsChart.tsx` with an import (behavior unchanged).
3. Implement `FlavorBubbleChart` importing the same function + `ChartContainer`.

# Scope

## Stat Cards
**Decision (Option A):** Exactly **six** stat cards. **Remove** "Top Bean" and "Avg Quality" from the dashboard row (they are replaced by the new set).

The six cards are:
1. Total Shots
2. This Week (shots in last 7 days)
3. Beans — count of distinct beans used (`beansCount` from API)
4. Avg Dose — average `doseGrams` (`avgDose` from API)
5. Avg Brew Ratio — unchanged (`avgBrewRatio`)
6. Avg Rating — use `avgRating` from API (already computed separately from `avgQuality`; do not show `avgQuality` on the dashboard)

Grid: responsive (e.g. `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`).

## Shot Activity (ShotHeatmap)
- Bug: displayed dates are incorrect — the heatmap uses `toISOString().slice(0,10)` which produces UTC dates that don't match the user's local date (off-by-one near midnight)
- The scale/legend must always be visible (currently inside the `overflow-x-auto` container and can scroll out of view on mobile)
- Auto-scroll horizontally to show the most recent weeks on load

## Charts
- **Remove** `ShotQualityChart` ("Shot Quality Over Time") entirely
- **Replace** `TopFlavorsChart` (bar chart of flavors by avg rating) with a bubble chart variant: X = flavor (category), Y = avg rating, bubble size = shot count
- **Update** `DialInChart`: add rating as an additional line series on a **secondary (right) Y-axis** (0–5); mechanical metrics remain on the primary left axis
- **Remove** `FlavorProfileChart` from the stats page **(Option A)** — the flavor bubble chart (rating + frequency via size) replaces the separate “top flavors by count” chart; delete the component file if nothing else imports it, or keep the module if reused elsewhere

## Shared Filter Bar (Dashboard + History)
- Both `/stats` and `/shots` pages share the same filter dimensions: date range and bean(s)
- Introduce a new `StickyFilterBar` component used on both pages
- **Mobile**: horizontal bar, sticky at the top; hides when scrolling down, reappears when scrolling up (scroll-reveal behavior)
- **Desktop**: horizontal bar, always sticky at the top
- **Filter pill design**: each filter has a title label above it and a small truncating selection box below showing the active value(s)
- **Clicking a filter pill** opens a modal for selection based on type:
  - Bean: searchable multi-select list
  - Date range: calendar date range picker
- **Shots page (Option B):** **Replace** the TanStack `FilterBar` entirely with `StickyFilterBar` (date range + beans only), aligned with `/stats`. **Remove** column filters for grinder, machine, reference shot, and hidden from the history UI. Filtering is URL-backed (`useFilterParams`) and applied at fetch time via `useShots()`. **Keep** the global search input, selection/bulk actions, export, and the data table — only the multi-column filter strip goes away. Users who need finer-grained filters rely on search (and future work if needed).

# Solution

## Stat Cards
Add `avgDose` (avg of `doseGrams`) and `beansCount` (count distinct `beanId`) queries to `GET /api/stats/overview`. Add `avgRating`, `avgDose`, and `beansCount` to the `OverviewStats` TypeScript interface (`avgRating` is already returned by the API). Render only the six cards listed in Scope; remove StatCard usage for "Top Bean" and "Avg Quality". Optional: leave `mostUsedBean` / `avgQuality` in the JSON response for other consumers, or omit from the overview payload if unused elsewhere — implementer’s choice.

## Heatmap Fixes
Replace `new Date(shot.createdAt).toISOString().slice(0, 10)` with a local-date formatter (e.g. `format(new Date(shot.createdAt), 'yyyy-MM-dd')` from `date-fns`, which respects the local timezone). For auto-scroll: attach a `ref` to the scroll container and set `scrollLeft = scrollWidth` in a `useEffect` after data loads. For the legend: move it outside the scrollable `div` wrapper so it's always visible regardless of horizontal scroll position.

## FlavorBubbleChart (replaces TopFlavorsChart)
New component `src/components/stats/FlavorBubbleChart.tsx`. Wrap with **`ChartContainer`**. Uses Recharts `ScatterChart` with dot size ∝ shot count; data from **shared** `aggregateFlavorStatsFromShots` (see Standardization). X-axis: flavor (category); Y-axis: avg rating (0–5). Replaces `TopFlavorsChart` in the primary charts row; delete `TopFlavorsChart.tsx` when unused.

## FlavorProfileChart removal
Remove `FlavorProfileChart` from `stats/page.tsx` and remove its dynamic import. If `FlavorProfileChart.tsx` has no other imports site-wide, delete the file; otherwise keep the file for other routes.

## DialInChart Rating Line **(Option A)**
Add `rating` (from `s.rating ?? s.shotQuality`) to the data points. Add a new `Line` with `yAxisId="right"` and a **secondary Y-axis** (`<YAxis yAxisId="right" orientation="right" domain={[0, 5]} />`) for rating only (green stroke, e.g. `#16a34a`). Existing mechanical metrics (`grindLevel`, `doseGrams`, `yieldGrams`, `brewTimeSecs`) stay on the **primary** left Y-axis (`yAxisId="left"` or default). Recharts: assign `yAxisId` on each `Line` and both `YAxis` components so scales don’t fight each other.

## StickyFilterBar Component
New component `src/components/ui/StickyFilterBar.tsx`. Wraps children in a sticky container with:
- **Desktop** (`md:+`): `position: sticky; top: 0` with background + shadow, always visible
- **Mobile**: same sticky positioning but with scroll-direction detection — track `window.scrollY` delta; add `transform: translateY(-100%)` on scroll-down, remove on scroll-up, with a CSS transition for smooth animation

### Filter pill design
Each filter slot rendered as a vertical stack:
- Title: small label (`text-[10px] font-medium text-stone-500 uppercase tracking-wide`)
- Trigger: bordered box (`rounded border border-stone-200 px-2 py-1 text-xs truncate max-w-[120px]`) showing the selected value(s) or a placeholder
- On click: opens a modal (`Dialog`) containing the appropriate picker (calendar for date, searchable checkbox list for beans)

### Shared filter state
Extract filter state (`dateRange`, `beanIds`) into a `useFilterParams` hook backed by URL search params (`useSearchParams` + `useRouter.replace`). Both `/stats` and `/shots` pages import this hook so filters persist when navigating between pages.

**Shots page integration (Option B):** Pass shared URL params into `useShots({ dateFrom, dateTo, beanIds })` from the parent (`shots/page.tsx` or `ShotsListView`). Remove `FilterBar` and strip grinder/machine/reference/hidden filter descriptors and column `filterFn` wiring from `useShotsHistoryController` / table column defs as needed so the table sorts and global-filters text only. Refactor `ShotsListView` layout: sticky header row with title/actions/search, then `StickyFilterBar`, then `ParameterRatingChart` + table.

# Tasks (consolidated, ≤10)

- [x] **1.** Overview API: `avgDose`, `beansCount`; extend `OverviewStats`; six stat cards on `stats/page.tsx` (drop Top Bean + Avg Quality cards).
- [x] **2.** `ShotHeatmap`: local date keys, auto-scroll to newest, legend outside horizontal scroll.
- [x] **3.** Add `src/lib/flavor-stats.ts` with `aggregateFlavorStatsFromShots` (+ depth cache exports as needed); refactor `FlavorRatingsChart` to import it (rating-only semantics, match `/api/stats/flavors`).
- [x] **4.** `FlavorBubbleChart`: `ChartContainer` + `ScatterChart`, shared aggregation; remove `ShotQualityChart`, `FlavorProfileChart`, `TopFlavorsChart` from stats page and delete unused files.
- [x] **5.** `DialInChart`: rating `Line` + secondary right `YAxis` 0–5, `yAxisId` wiring.
- [x] **6.** `src/lib/use-filter-params.ts`: URL-backed date + `beanIds`.
- [x] **7.** `StickyFilterBar`: sticky + mobile scroll-reveal + modal pickers.
- [x] **8.** Wire `/stats`: `useFilterParams` + `StickyFilterBar` (replace `FilterBarStrip`).
- [x] **9.** Wire `/shots` + `ShotsListView`: `useShots` params from URL; `StickyFilterBar` replaces `FilterBar`; strip column filters / `shotFilterDescriptors` for bean, date, grinder, machine, reference, hidden.
- [ ] **10.** *(Optional)* Extract `ToggleGroup` to `components/ui`; shared Recharts tooltip `contentStyle`; migrate `DialInChart` / other stats charts to `ChartContainer` (`controllers` vs `xController` per ChartContainer deep dive); fix `font-xl` typo on `xController` wrapper in `ChartContainer.tsx`.

## Additional Tasks

- [x] Photo gallery with horizontal scroll strip, snap-scrolling thumbnails, and full-size lightbox on click — wired into shot form (ShotPhotoUpload), shot detail (ShotPhotoGallery via ShotDetail), and public share page (SSR images prefetched server-side, passed through SharedShotDetail → ShotDetail → ShotPhotoGallery → ShotPhotoStripLightbox).
