# Problem Statement

The shot log form has several UX issues (stepper layout, timer, sliders, keyboard navigation, validation feedback), the bean data model is missing per-user ownership and normalized fields, tools creation should be locked down, the dashboard needs richer analytics (heatmap, quality over time, dial-in progression, bean age analysis), and seed data needs cleanup.

# Scope

## Shot Log UX
- **NumberStepper layout**: Up/down (−/+) buttons must be side-by-side instead of flanking the value. Currently: `[−] [value] [+]`. Target: `[value] [− +]`.
- **Brew Timer**: Add a Start/Pause stopwatch control below the Brew Time field in SectionResults. Pressing Start runs a timer that fills `brewTimeSecs`. Pressing Pause stops it. Value can still be manually edited.
- **Click-only sliders**: Shot Quality and Rating sliders (`Slider.tsx`) must not allow drag/slide. Users should only be able to click (tap) a position to set the value. Remove `onPointerMove` drag behavior.
- **Notes field focus jumping**: After entering a value in any NumberStepper or other input and pressing Enter, focus must advance to the next logical input in the form instead of jumping erratically. Requires proper `tabIndex` ordering and `onKeyDown` → `focusNext` logic.
- **Validation error banner**: When the form has required-field errors and submit fails, display a prominent banner at the top of the form listing the missing fields (not just a small red text under the submit button).
- **Beans fields stacked**: In `BeanSelector.tsx`, the bean detail fields (origin, roaster, processing, roast level, roast date) should be stacked vertically (single column) instead of the current 2-col and 3-col grid layout.
- **Edit Order for Results section**: Add a similar "Edit Order" menu/modal (like `RecipeOrderModal` in `SectionRecipe`) for the Results & Tasting section, allowing users to reorder and show/hide: Actual Yield, Brew Time, Estimate Max Pressure, Shot Quality, Rating, Notes.

## Data / Schema Changes
- **Estimate Max Pressure field**: Add `estimateMaxPressure` (numeric, optional) to the shots table and `createShotSchema`. Add a NumberStepper field in SectionResults with quick-select buttons for common pressures (6, 9, 12 bar). Hidden by default in Edit Order.
- **Flow Control input**: Add `flowControl` (numeric, optional) to the shots table — a single flow rate value in ml/s. Hidden from the UI by default (available via Edit Order toggle).
- **Remove user tool creation**: Remove the "Add Tool" button from `ToolSelector.tsx` and remove the `POST` handler from `src/app/api/equipment/tools/route.ts`. Tools should only come from seed data.
- **Seed data fixes**: Update `src/shared/equipment/constants.ts`:
  - Delete the "Tamper" tool entry (`slug: "tamper"`)
  - Rename "Distribution Tool" to "Wedge Distribution" (`slug: "distribution-tool"` → update name to "Wedge Distribution")
  - Update `seed.ts` to also delete "Tamper" from the DB and rename "Distribution Tool" for existing installations.

## Bean Model Expansion
- **`beans.user_id`**: Rename the existing `createdBy` column to `userId` via migration for clearer semantics. Update all code references (`schema.ts`, Zod schemas, API routes, components) from `createdBy` to `userId`. The column remains uuid FK → users.id, scoping beans per user.
- **`beans.origin_id`**: Add an `originId` (integer FK) column to beans, referencing a new global `origins` table (id serial, name text unique). Origins are shared across all users. No auto-migration of existing `origin` text values — start fresh. The old `origin` text column is kept for historical reference; new beans use `originId` going forward.
- **`beans.origin_details`**: Add `originDetails` (text, optional) to the beans table for per-user free-text origin notes.
- **`beans.roaster_id`**: Add `roasterId` (integer FK) to beans, referencing a new global `roasters` table (id serial, name text unique). Auto-migrate existing `roaster` text values: extract unique non-null values into the `roasters` table, then backfill `roasterId` on existing beans rows. The old `roaster` text column is kept for historical reference.
- **`beans.open_bag_date`**: Add `openBagDate` (timestamp, optional) to the beans table for tracking when a bag was opened.

## Dashboard Improvements
- **Top Flavors chart**: Show the user's top flavors ranked by average rating. Aggregate `flavorWheelCategories` across shots, compute avg rating per flavor tag.
- **Smaller stat cards**: Reduce the size of the top StatCard numbers (currently large text).
- **GitHub-style heatmap**: Add a contribution-style heatmap showing shot count per day-of-week and week. Similar to GitHub's contribution graph.
- **Remove Ratio Chart**: Remove the `RatioChart` component from the dashboard.
- **Shot Quality Over Time**: Add a line chart plotting `shotQuality` over time (chronological, x-axis = date, y-axis = quality 1–5).
- **Dial-In Progression per Bean**: Add a multi-line or scatter chart for a selected bean showing grind level, dose, yield, and brew time across shots in chronological order.
- **Bean Roast-Age Analysis**: Add a chart or stat showing the relationship between bean age (days since roast date and/or days since bag open date) and shot quality/rating. Add a button/display for "Days since bag open" and "Days since roast".

# Solution

The work is split into four areas that can be implemented mostly independently:

**Shot Log UX (Phase 1–2):** Modify `NumberStepper.tsx` to place −/+ buttons adjacent. Add a `BrewTimer` component rendered below the Brew Time stepper. Change `Slider.tsx` to remove `onPointerMove` handling (click-only). Fix focus management by chaining `tabIndex` and adding `onKeyDown` → `focusNextField()`. Add a `ValidationBanner` component at the top of `ShotForm.tsx` that renders when `formState.errors` has entries after submit. Stack BeanSelector detail fields to single-column. Build `ResultsOrderModal` (reuse the `RecipeOrderModal` pattern) for the Results & Tasting section.

**Data & Schema (Phase 3):** Add `estimateMaxPressure` (numeric) and `flowControl` (numeric ml/s) columns to the shots table. Add `originDetails`, `openBagDate` columns to beans. Create new `origins` and `roasters` tables. Add FKs `originId` and `roasterId` to beans. Update Zod schemas. Update seed script. Remove tool creation API and UI.

**Dashboard (Phase 4):** Remove `RatioChart`. Add `ShotQualityChart` (line), `TopFlavorsChart` (bar), `ShotHeatmap` (GitHub-style), `DialInChart` (multi-line per bean), and `BeanAgeAnalysis` components. Reduce StatCard sizing. Wire everything into `DashboardPage`.

This phased approach minimizes risk: UX changes are purely frontend, schema changes require migrations, and dashboard charts are additive. The Edit Order pattern for Results reuses the existing `RecipeOrderModal` architecture already proven in SectionRecipe.

# Tasks

## Phase 1: Shot Log UX Fixes

- [x] **NumberStepper layout**: Refactor `NumberStepper.tsx` — move −/+ buttons to be adjacent (right side of value), instead of flanking the value.
- [x] **Click-only sliders**: Modify `Slider.tsx` — remove `onPointerMove` handler so slider only responds to click/tap, not drag.
- [x] **Bean fields stacked**: Update `BeanSelector.tsx` — change 2-col and 3-col grids to single-column stacked layout in both create and edit/view modes.
- [x] **Validation error banner**: Create `ValidationBanner` component — display at top of form when submit fails with required field errors. Wire into `ShotForm.tsx`.
- [x] **Notes/input focus fix**: Fix Enter-key navigation across form fields — ensure Enter in NumberStepper and other inputs advances focus to next field in order.
- [x] **Smaller dashboard stat cards**: Reduce font size/padding in `StatCard.tsx` for the top stat numbers.

## Phase 2: Shot Log Features

- [x] **Brew Timer**: Create `BrewTimer` component with Start/Pause button, rendered below Brew Time NumberStepper in `SectionResults.tsx`. Timer writes to `brewTimeSecs` form field.
- [x] **Results Edit Order**: Build `ResultsOrderModal` (reuse `RecipeOrderModal` pattern) for Results & Tasting section. Add menu button to SectionResults header. Support reorder and show/hide for: Actual Yield, Brew Time, Estimate Max Pressure, Shot Quality, Rating, Notes.
- [x] **Estimate Max Pressure field**: Add `estimateMaxPressure` to `SectionResults.tsx` as a NumberStepper with quick-select buttons (6, 9, 12 bar). Hidden by default in Results Edit Order.

## Phase 3: Data & Schema Changes

- [x] **Shots schema**: Add `estimateMaxPressure` (numeric, optional) and `flowControl` (numeric ml/s, optional) columns to shots table in `schema.ts`. Update `createShotSchema` and `shotSchema` in `shared/shots/schema.ts`.
- [x] **Beans schema expansion**: Rename `createdBy` → `userId` on beans table. Add `originDetails` (text), `openBagDate` (timestamp) columns to beans table. Create `origins` table (id serial, name text unique). Create `roasters` table (id serial, name text unique). Add `originId` and `roasterId` FK columns to beans. Auto-migrate existing `roaster` text values into `roasters` table and backfill `roasterId`. Update all code references from `createdBy` to `userId`.
- [x] **Update beans Zod schemas**: Update `shared/beans/schema.ts` with new fields. Update `BeanSelector.tsx` create/edit forms to include `openBagDate` and `originDetails`.
- [x] **Seed data fixes**: Remove "Tamper" from `DEFAULT_TOOLS`. Rename "Distribution Tool" to "Wedge Distribution". Update `seed.ts` to clean up existing DB entries (delete tamper, rename distribution tool).
- [x] **Remove tool creation**: Delete `POST` handler from `src/app/api/equipment/tools/route.ts`. Remove "Add Tool" button and create form from `ToolSelector.tsx`. Remove `useCreateTool` hook from `equipment/hooks.ts`.
- [x] **Generate and apply migration**: Manually wrote migration SQL `0001_phase3_schema_changes.sql` (drizzle-kit interactive prompts not available in non-interactive terminal). Migration includes all schema changes plus auto-migration of roaster text values.

## Phase 4: Dashboard Improvements

- [x] **Remove RatioChart**: Delete `RatioChart.tsx` and remove from `DashboardPage`.
- [x] **Shot Quality Over Time chart**: Create `ShotQualityChart.tsx` — line chart with date on x-axis, shotQuality on y-axis.
- [x] **Top Flavors chart**: Create `TopFlavorsChart.tsx` — bar chart showing top flavor tags ranked by avg rating across shots.
- [x] **GitHub-style heatmap**: Create `ShotHeatmap.tsx` — contribution-style grid showing shot count per day, organized by week/day-of-week.
- [x] **Dial-In Progression chart**: Create `DialInChart.tsx` — multi-line or scatter chart for a selected bean, plotting grind level, dose, yield, brew time across chronological shots.
- [x] **Bean Roast-Age Analysis**: Create `BeanAgeChart.tsx` — chart/stat showing bean age (days since roast, days since bag open) vs quality/rating. Add "Days since open" / "Days since roast" display.
- [x] **Wire dashboard**: Update `DashboardPage` to include all new charts, remove old ones, reduce StatCard sizing.
