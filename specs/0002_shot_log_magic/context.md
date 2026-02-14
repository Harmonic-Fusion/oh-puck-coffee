# Problem Statement

The shot log form and navigation need UX improvements to make logging shots faster and more intuitive. Users want quick-select buttons for common values, better navigation with collapsible menus, improved readability of quality/rating sliders, searchable selectors for equipment/beans, and enhanced visual feedback. The settings page should also display user profile information more prominently. Additionally, when pre-populating from a previous shot, users want to see context about that shot and be able to view/edit it directly from the form.

# Scope

## Core Requirements

1. **Quick-select buttons for Actual Yield**: Add a "Target" button that sets Actual Yield to the Target Yield value
2. **Quick-select buttons for Brew Time**: Add buttons for 10s, 15s, 20s, 25s, 30s
3. **Menu Bar improvements**:
   - Display user name/email above "Sign out" button
   - Replace emoji icons with Heroicons 2 icons
   - Make sidebar collapsible (not top-level menu bar)
   - Mobile menu: increase height, reorder items (Settings, History, Dashboard, Log)
4. **Settings page**: Display Google account details (email, image) prominently
5. **Shot Quality label**: Change label for value 1 from "Severe channeling/spraying" to "Failed to Extract"
6. **Shot Quality and Rating readability**: Fix text squishing in slider labels
7. **Searchable selectors**: Add search functionality to GrinderSelector, MachineSelector, and BeanSelector with:
   - Search bar at top
   - "Add new" button at bottom
   - Scrollable list of items in middle, ordered by most recent log message with that item
8. **Previous Shot display**: Add a "Previous Shot" row in the Recipe section that:
   - Shows when a previous shot is being used to pre-populate the form (from URL params, sessionStorage duplicate, or lastShot)
   - Displays Notes (truncated if long) and badges for Quality, Rating, Brew Time, and Ratio
   - Includes a "View Shot" button that navigates to history page and opens the shot detail modal
   - The shot detail modal should support editing the shot (requires new edit API endpoint and form)

## Bonus Features

9. **Random encouraging phrases**: Replace static "Record your espresso shot details and tasting notes" with random encouraging phrases
10. **Wavy steam animation**: Add animated steam overlays that fade in/out when clicking "Log Shot" button

## Boundaries

- No database schema changes required
- API changes required: Add PATCH endpoint for editing shots (`/api/shots/[id]`)
- All changes are UI/UX improvements plus one new API endpoint
- Heroicons 2 needs to be installed as a dependency
- Steam animation should be CSS-based or lightweight SVG animation
- Shot editing should use the same validation schema as shot creation

## Dependencies

- Read @.contextual/context/guidelines.md for the complete list of critical rules for every change.
- Install `@heroicons/react` package (v2)
- Existing form components and hooks
- Session data from `next-auth/react`
- Shot history data for ordering selectors by most recent use
- Shot editing requires new API endpoint and edit form component
- History page needs to support URL query param to open specific shot modal (e.g., `?shotId=xxx`)

# Solution

## Quick-Select Buttons Pattern

Follow the existing pattern in `SectionRecipe.tsx` for quick-select buttons (similar to dose, ratio, and pressure buttons). Add:
- "Target" button next to Actual Yield that copies `yieldGrams` to `yieldActualGrams`
- Time buttons (10s, 15s, 20s, 25s, 30s) next to Brew Time input

## Navigation Improvements

1. **Sidebar collapsible**: Add toggle button to collapse/expand sidebar, persist state in localStorage
2. **Icons**: Replace emoji icons with Heroicons 2 icons (BeakerIcon, ClipboardDocumentListIcon, ChartBarIcon, Cog6ToothIcon)
3. **User info**: Display user name and email in sidebar above sign out button (already exists in Sidebar, needs to be added to NavBar)
4. **Mobile menu**: Increase height from `h-14` to `h-16` or `h-18`, reorder nav items array

## Settings Page

Enhance existing profile section to show Google account image and email more prominently (already partially implemented, needs refinement).

## Slider Improvements

1. **Shot Quality label**: Update `labels` prop in `SectionResults.tsx` for shotQuality slider
2. **Readability**: Adjust `Slider.tsx` component to prevent text squishing:
   - Increase `max-w-[20%]` to allow more space
   - Use `text-ellipsis` or multi-line labels
   - Consider reducing font size or using abbreviations for long labels

## Searchable Selectors

Transform existing `<select>` elements into searchable dropdowns:
- Create reusable `SearchableSelect` component
- Replace native `<select>` in GrinderSelector, MachineSelector, BeanSelector
- Order items by most recent shot that used them (query shot history, group by equipment/bean ID, sort by max createdAt)
- Layout: Search input at top, scrollable list in middle, "Add new" button at bottom

## Previous Shot Display

1. **Track pre-population source**: In `ShotForm.tsx`, track which shot is being used for pre-population (store shot ID when pre-populating from lastShot or duplicate)
2. **Previous Shot row**: Add new recipe step type "previousShot" that renders conditionally when a previous shot is being used
3. **Display format**: Show truncated notes (max 2-3 lines), badges for Quality (e.g., "Quality: 4/5"), Rating (e.g., "Rating: 4.5/5"), Brew Time (e.g., "30s"), and Ratio (e.g., "1:2.5")
4. **View button**: Button navigates to `AppRoutes.history.path?shotId={shotId}` which opens the modal
5. **Edit functionality**: 
   - Create PATCH `/api/shots/[id]` endpoint that validates and updates shot data
   - Create `ShotEditForm` component (reuse form sections from `ShotForm`)
   - Add edit mode to `ShotDetail` modal with toggle between view/edit
   - Update `history/page.tsx` to read `shotId` from URL params and open modal

## Bonus Features

1. **Random phrases**: Create array of encouraging phrases, use `useMemo` with random selection on mount
2. **Steam animation**: Create `SteamOverlay` component with CSS animations or SVG paths, trigger on "Log Shot" button click, fade in/out over 2-3 seconds

# Tasks

## Phase 1: Quick-Select Buttons and Label Updates

- [x] Add "Target" quick-select button to Actual Yield field in `SectionResults.tsx`
- [x] Add time quick-select buttons (10s, 15s, 20s, 25s, 30s) to Brew Time field in `SectionResults.tsx`
- [x] Update Shot Quality slider label for value 1 to "Failed to Extract" in `SectionResults.tsx`
- [x] Improve Slider component label readability (increase max-width, handle text overflow)

## Phase 2: Navigation Improvements

- [x] Install `@heroicons/react` package (v2)
- [x] Replace emoji icons with Heroicons in `Sidebar.tsx` and `NavBar.tsx`
- [x] Add collapsible functionality to `Sidebar.tsx` (toggle button, localStorage persistence)
- [x] Add user name/email display to `NavBar.tsx` desktop header
- [x] Update mobile menu height and reorder items in `NavBar.tsx`

## Phase 3: Previous Shot Display and Editing

- [x] Track pre-population source shot ID in `ShotForm.tsx` (store when using lastShot or duplicate)
- [x] Add "Previous Shot" recipe step type to `SectionRecipe.tsx` (render conditionally when previous shot exists)
- [x] Create `PreviousShotRow` component displaying notes (truncated), Quality/Rating/Brew Time/Ratio badges, and "View Shot" button
- [x] Add shotId query param support to history page to open specific shot modal
- [x] Create PATCH `/api/shots/[id]` endpoint for editing shots (validate with same schema as create)
- [x] Create `useUpdateShot` hook in `shots/hooks.ts`
- [x] Create `ShotEditForm` component (reuse form sections, pre-populate with shot data)
- [x] Add edit mode toggle to `ShotDetail` modal (view/edit states)
- [x] Integrate edit form into `ShotDetail` modal

## Phase 4: Settings Page and Selector Search

- [x] Enhance Settings page profile section to prominently display Google account details
- [x] Create `SearchableSelect` component with search input, scrollable list, and "Add new" button
- [x] Add API endpoint or hook to fetch equipment/beans ordered by most recent shot usage
- [x] Replace native `<select>` with `SearchableSelect` in `GrinderSelector.tsx`
- [x] Replace native `<select>` with `SearchableSelect` in `MachineSelector.tsx`
- [x] Replace native `<select>` with `SearchableSelect` in `BeanSelector.tsx`

## Phase 5: Bonus Features

- [ ] Create array of encouraging phrases and implement random selection in `log/page.tsx`
- [ ] Create `SteamOverlay` component with CSS/SVG animations
- [ ] Integrate steam animation trigger on "Log Shot" button click in `ShotForm.tsx`

## Additional Tasks

- [ ] Make the "Log Shot" button 100% width and taller. Center it in the form.
- [ ] After clicking "Log Shot", show a modal summary with a share link. The link should be the current shot detail page URL. Include summary of details, rating, and notes. Bottom should have buttons "Dashboard", "Log Another", "Share". X to close the modal large at the top right.
