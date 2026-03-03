# Problem Statement

The espresso shot log form has menus (three-dot dropdowns) on the Recipe and Results sections that are not discoverable and clutter the header. Sections also start expanded, which creates a long, overwhelming form. The Setup section already has a good collapsed+summary pattern that should be applied consistently.

# Scope

- **SectionRecipe** (`src/components/shots/form/SectionRecipe.tsx`): remove three-dot menu from header
- **SectionResults** (`src/components/shots/form/SectionResults.tsx`): remove both three-dot menus (Results + Tasting sub-sections)
- **Footer**: add a ghost "Change Inputs" button that opens the edit-order modal (replacing the menu entry point)
- **Collapsible sections**: SectionRecipe and SectionResults made collapsible like SectionBasics — collapsed by default, with a data summary shown inline
- **Expand-on-load**: All sections (Setup, Recipe, Results, Tasting) start **collapsed**
- **ShotSuccessModal / shot log page**: remove QR Code for recipe (the "Recipe QR Code" menu item and its modal in SectionRecipe); the shot share QR on the log page is separate and should NOT be removed

# Solution

Mirror the SectionBasics collapsible pattern across all form sections:
- Each section has a collapsed state showing a one-line data summary
- Clicking the collapsed row expands the section
- A ChevronUp button collapses it again when expanded
- The three-dot menus are removed; "Edit Inputs" access moves to a ghost "Change Inputs" button in the form footer
- QR Code generation (recipe QR) is removed from SectionRecipe entirely

This approach was chosen because: the collapsible pattern already exists and is understood by users; moving "Edit Inputs" to the footer makes it a persistent, discoverable action rather than a hidden menu item; and removing QR code reduces scope/complexity of the recipe section.

# Tasks

## Phase 1 — SectionBasics: Remove Auto-Expand

**File:** `src/components/shots/form/SectionBasics.tsx`

- [x] Remove the `useEffect` that auto-expands the section when neither grinder nor machine is selected — Setup should start collapsed regardless of whether equipment is set
- [x] Remove `useEffect` from the React import if it becomes unused

## Phase 2 — SectionRecipe: Remove Menu & QR, Add Collapse

**File:** `src/components/shots/form/SectionRecipe.tsx`

- [x] Remove `showMenu`, `showQRCode` state; remove `menuRef` ref; remove the click-outside `useEffect` for the menu
- [x] Remove `recipeQRUrl` `useMemo` block; remove `QRCode` import and `Modal` import (only used for QR); remove the `<Modal open={showQRCode} ...>` JSX block
- [x] Remove the `{!showAllInputs && <div className="relative" ref={menuRef}>...}` kebab dropdown JSX block entirely
- [x] Add `isRecipeExpanded` state (`useState(false)`) — starts collapsed
- [x] Derive `recipeSummaryText` from already-watched fields: `dose`, `yieldG`, `grindLevel` (no new hook needed)
- [x] Rewrite section header JSX using the SectionBasics two-state pattern: collapsed = full-width button with summary + ChevronDown; expanded = header row with ChevronUp button; guard ChevronUp with `hasRecipeSummary`
- [x] Add `ChevronDownIcon`, `ChevronUpIcon` to heroicons import; remove `useRef` if `menuRef` was the only ref
- [x] When `showAllInputs` is true: always render fully expanded, no collapse chrome

## Phase 3 — SectionResults: Remove Both Menus, Add Collapse to Both Cards

**File:** `src/components/shots/form/SectionResults.tsx`

- [x] Remove `showResultsMenu`, `showTastingMenu` states; remove `resultsMenuRef`, `tastingMenuRef` refs; delete the combined click-outside `useEffect` entirely
- [x] Add `isResultsExpanded` state (`useState(false)`) for the Results card — starts collapsed
- [x] Derive `resultsSummaryText` from `brewTime` + `yieldActual` (already watched)
- [x] Rewrite Results card header using the two-state collapsible pattern
- [x] Add `isTastingExpanded` state (`useState(false)`) for the Tasting Notes card — starts collapsed
- [x] Add `rating` to the existing `watch()` destructuring (currently only accessed via Controller)
- [x] Derive `tastingSummaryText` from `rating` (e.g. `★ 4`)
- [x] Rewrite Tasting Notes card header using the two-state collapsible pattern
- [x] Add `ChevronDownIcon`, `ChevronUpIcon` to heroicons import; remove `useRef` if both menu refs were the only refs
- [x] When `showAllInputs` is true: always render both cards fully expanded, no collapse chrome
- [x] Keep both `EditOrderModal` blocks (`showResultsOrderModal`, `showTastingOrderModal`) unchanged

## Phase 4 — ShotForm: Add "Change Inputs" Ghost Button to Footer

**File:** `src/components/shots/form/ShotForm.tsx`

- [x] Add three modal-open state variables: `showRecipeInputsModal`, `showResultsInputsModal`, `showTastingInputsModal` (all `useState(false)`)
- [x] Pass open/close props into section components: `orderModalOpen` + `onOrderModalClose` to `SectionRecipe`; `resultsModalOpen` + `onResultsModalClose` + `tastingModalOpen` + `onTastingModalClose` to `SectionResults`; update each section's props interface accordingly
- [x] Inside each section, use `open={orderModalOpen ?? showOrderModal}` — internal state as fallback for standalone usage (e.g. `ShotEditForm`)
- [x] Add ghost button row to the form footer (above the primary Log Shot button):
  - Three ghost buttons: "Recipe inputs", "Results inputs", "Tasting inputs"
  - Each calls `setShowXxxInputsModal(true)`

## Phase 5 — ShotEditForm: Verify No Regressions

**File:** `src/components/shots/form/ShotEditForm.tsx`

- [x] Confirm `showAllInputs` is still passed to both `<SectionRecipe>` and `<SectionResults>` — no collapse chrome or footer buttons should appear in the edit form
- [x] Confirm all new section props are optional with safe `undefined` defaults — `ShotEditForm` should require zero changes

## Phase 6 — Import Cleanup

- [x] `SectionRecipe.tsx`: remove `QRCode`, `Modal` imports; remove `useRef`; add `ChevronDownIcon`, `ChevronUpIcon`
- [x] `SectionResults.tsx`: remove `useRef`; add `ChevronDownIcon`, `ChevronUpIcon`; add `rating` to `watch()` call

# Additional Tasks

- [x] Auto-expand Recipe/Results/Tasting sections on load if they have visible inputs (Setup always stays collapsed)
- [x] Ghost "Edit inputs" button moved into each section component (collapsed: below expand row; expanded: inline in header); removed from ShotForm footer

## Phase 7 — Review

- [ ] Manually test the log form: all four sections start collapsed with correct summary text visible
- [ ] Expand/collapse each section and confirm chevron direction and summary update correctly
- [ ] Confirm the "Change Inputs" ghost button row appears in the log form footer and each button opens the correct modal
- [ ] Confirm the edit shot form (`ShotEditForm`) shows all sections fully expanded with no collapse chrome or footer buttons
- [ ] Confirm no QR code option appears anywhere in the recipe section
- [x] TypeScript build passes: `pnpm tsc --noEmit`
