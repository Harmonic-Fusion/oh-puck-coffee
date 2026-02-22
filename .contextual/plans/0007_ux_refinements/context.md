# Problem Statement

The shot logging form and related UI components have multiple UX friction points that need refinement: form errors appear at the top instead of near the submit button, the share modal shows unnecessary link/copy UI, rating display lacks visual stars, temperature preferences aren't consistently applied, recipe/results sections need ratio and yield in both, field auto-advance interferes with manual input, selected section labels are unclear, and there's no public documentation/blog section to help users understand the form fields. Additionally, various UI polish items like slider number sizes, badge ordering, and clearer field organization need attention.

# Scope

- **Form error positioning**: Move validation errors from top of form to below submit button, with clickable links to jump to each field
- **Field and section IDs**: Add unique IDs to all form fields and sections for anchor linking
- **Shot share modal**: Remove link input and copy button, show only share button that uses Web Share API or clipboard fallback
- **Rating display**: Show star icons (⭐) in addition to numeric rating, rounded up (1.5 = ⭐⭐)
- **Stack display**: Stack brew time, quality, and rating together in results section
- **Temperature display**: Show temperature in user's preferred unit (F or C) throughout the app, not just in the form
- **Number rounding**: Round all displayed numbers to one decimal place maximum
- **Recipe and Results sections**: Both should display ratio and yield. Recipe shows target values, Results shows actual values
- **Pre-population fix**: Fix pre-population from last shot
- **Field auto-advance**: Prevent auto-advance to next field when user manually inputs a value
- **Selected section labels**: Change "Selected" to "Selected {section}" (e.g., "Selected Flavors")
- **Blog section**: Create public `/blog` section (marked `_is_public: true` in routes) with pages for shot log documentation
- **Blog sidebar**: Add sidebar navigation for blog pages with anchors (#Bean, #Grinder, #Machine, #Recipe, #Results)
- **Info buttons**: Add info buttons next to form sections that link to relevant blog pages
- **Slider numbers**: Make slider number displays even bigger
- **Selected section clear button**: Change to outline button style
- **Badge ordering**: Enable drag-and-drop ordering for badges in Selected sections
- **Actual ratio display**: Show calculated ratio below "Actual Yield" subtitle, display "-/-" if null
- **Flow rate display**: Show flow rate below brew time (not in input field), display "-:-" if empty
- **Remove "(optional)" labels**: Remove from pre-infusion and Machine fields
- **Search select deselect**: Add "Deselect" button at bottom of search select dropdown, next to "Add new"
- **Temperature unit toggle**: Change from "Switch to 'C" button to quick-select buttons (like dose/ratio presets)

# Solution

## Form Errors and Field IDs

Move `ValidationBanner` below submit button in `ShotForm.tsx`. Add `id` attributes to all sections (`setup`, `recipe`, `results`) and form fields. Enhance `ValidationBanner` to render clickable error items that scroll to fields using `scrollIntoView`.

## Share Modal and Rating

Remove share link input/copy button from `ShotSuccessModal.tsx`, keep only "Share" button. Create `formatRating()` helper that displays numeric rating with star emojis (rounded up: 1.5 = ⭐⭐). Apply to all rating displays.

## Temperature and Number Formatting

Create `useTempUnit()` hook and `formatTemp()` utility to apply temperature preference app-wide. Create `roundToOneDecimal()` utility for consistent number formatting (1 decimal max, "-" for null).

## Ratio/Yield/Flow Rate Displays

Add calculated ratio displays below "Target Yield" (Recipe) and "Actual Yield" (Results). Move flow rate from `secondarySuffix` to separate display below brew time. Show "-/-" or "-:-" when values are null.

## Form Behavior Fixes

Fix pre-population: reset `hasPrePopulated.current` when navigating to log page (IDs will handle navigation). Fix auto-advance: track manual input vs stepper buttons in `NumberStepper`, only advance on stepper changes.

## Selected Sections UI

Update "Selected" labels to "Selected {sectionName}" (Flavors, Body, Adjectives). Change clear button to outline variant. Badge drag-and-drop already implemented - verify it works.

## Search Select and Temperature Toggle

Add "Deselect" button to `SearchableSelect` dropdown (show only when value selected). Replace temperature toggle button with quick-select buttons (°C / °F) matching dose/ratio preset styling.

## Slider and Label Polish

Increase slider number sizes: badge `text-2xl font-bold`, ticks `text-base font-medium`. Remove "(optional)" text from pre-infusion and Machine field labels.

## Blog Section

Create public `/blog/shot-log` page with documentation. Add blog route to `AppRoutes` in `src/app/routes.ts` with `_is_public: true`. Add anchor sections: `#Bean`, `#Grinder`, `#Machine`, `#Recipe`, `#Results`. Add info icon buttons next to section headings linking to blog anchors.

# Tasks

## Phase 1: Form Errors and Field IDs

- [x] Move `ValidationBanner` below submit button in `ShotForm.tsx`
- [x] Add `id` attributes to sections (`setup`, `recipe`, `results`) and all form fields
- [x] Enhance `ValidationBanner` with clickable errors that scroll to fields

## Phase 2: Share Modal and Rating

- [x] Remove share link input/copy from `ShotSuccessModal.tsx`
- [x] Create `formatRating()` helper in `src/lib/format-rating.ts`
- [x] Apply `formatRating()` to all rating displays

## Phase 3: Temperature and Number Formatting

- [x] Create `useTempUnit()` hook and `formatTemp()` utility in `src/lib/format-numbers.ts`
- [x] Create `roundToOneDecimal()` utility
- [x] Apply temperature formatting to `ShotDetail`, `ShotSuccessModal`, `SharedShotView`
- [x] Apply number rounding throughout app

## Phase 4: Ratio/Yield/Flow Rate Displays

- [x] Add ratio display below "Target Yield" in Recipe section
- [x] Add ratio display below "Actual Yield" in Results section
- [x] Move flow rate from `secondarySuffix` to separate display below brew time

## Phase 5: Form Behavior Fixes

- [x] Reset `hasPrePopulated.current` when navigating to log page
- [x] Add `isManualInput` ref to `NumberStepper` to track keyboard vs stepper input
- [x] Only auto-advance on stepper changes, not manual input

## Phase 6: Selected Sections UI

- [x] Update "Selected" labels to "Selected {sectionName}" in all flavor wheel components
- [x] Change clear button to outline variant in `SelectedBadges.tsx`
- [x] Remove "(optional)" from pre-infusion and Machine labels

## Phase 7: Search Select and Temperature Toggle

- [x] Add "Deselect" button to `SearchableSelect` dropdown
- [x] Replace temperature toggle with quick-select buttons (°C / °F) in `SectionRecipe.tsx`

## Phase 8: Slider and Polish

- [x] Increase slider number sizes (badge: `text-2xl`, ticks: `text-base`)
- [x] Verify badge drag-and-drop works (already implemented)

## Phase 9: Blog Section



- [x] Add blog route to `AppRoutes` in `src/app/routes.ts` with `_is_public: true`
- [x] Create `src/app/(landing)/blog/shot-log/page.tsx` with anchor sections
- [x] Add info icon buttons next to section headings linking to blog anchors

# Additional Tasks

- [x] Remove top nav bar; use only left sidebar (sm+) and mobile bottom bar (<sm), no tablet view
