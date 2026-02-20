# Problem Statement

Users need a way to log shots made with pre-ground coffee. Currently, the system requires selecting a grinder and optionally entering a grind level, but pre-ground coffee doesn't have a grind level setting since it's already ground. The solution is to add "Pre-ground" as a special grinder option that appears at the top of the list, and automatically hide/clear the grind level field when selected.

# Scope

- Add "Pre-ground" to the default grinders seed data
- Implement sorting logic to show special grinders (like "Pre-ground") at the top of the grinder selector, with others sorted alphabetically
- Conditionally hide the grind level field in the recipe section when "Pre-ground" is selected
- Automatically clear grind level value when user switches to "Pre-ground" grinder
- No database schema changes required (grindLevel is already optional)
- Must work in both shot creation and shot editing forms
- Must preserve existing functionality for all other grinders

# Solution

**Option 1: "Pre-ground" as a Special Grinder** - This approach treats "Pre-ground" as a special grinder entry that appears at the top of the list. When selected, the grind level field is hidden and any existing value is cleared. This is the simplest approach that requires minimal code changes and no schema modifications.

**Why this approach:**
- Minimal code changes (seed script + UI logic)
- No database migrations needed
- Clear in shot history (shows "Pre-ground" as grinder)
- Consistent with existing data model
- Easy to filter in analytics if needed

**Implementation details:**
1. Add "Pre-ground" to `DEFAULT_GRINDERS` in seed script
2. Update `GrinderSelector` to sort grinders with special ones at top, others alphabetically
3. Update `SectionRecipe` to detect when "Pre-ground" is selected and hide/clear grind level
4. Ensure the logic works in both `ShotForm` and `ShotEditForm`

# Tasks

## Phase 1: Seed Data Setup

- [x] Add "Pre-ground" to `DEFAULT_GRINDERS` array in `scripts/seed.ts`
- [ ] Run seed script to verify "Pre-ground" is added to database

## Phase 2: Grinder Selector Sorting

- [x] Update `GrinderSelector` component to sort grinders with special names (like "Pre-ground") at the top
- [x] Implement alphabetical sorting for remaining grinders
- [x] Define a constant or helper function to identify special grinders
- [ ] Test that sorting works correctly with existing and new grinders

## Phase 3: Conditional Grind Level Field

- [x] Import `useGrinders` hook in `SectionRecipe` component
- [x] Watch `grinderId` form value to detect selected grinder
- [x] Find selected grinder from grinders list to check if it's "Pre-ground"
- [x] Conditionally hide grind level step in `renderStep` function when "Pre-ground" is selected
- [x] Add `useEffect` to clear grind level value when switching to "Pre-ground"
- [x] Verify logic works in both `ShotForm` and `ShotEditForm` contexts (SectionRecipe is shared component)

## Phase 4: Testing & Validation

- [ ] Test creating a new shot with "Pre-ground" selected (grind level should be hidden)
- [ ] Test switching from regular grinder to "Pre-ground" (grind level should clear and hide)
- [ ] Test switching from "Pre-ground" to regular grinder (grind level should reappear)
- [ ] Test editing an existing shot with "Pre-ground" (grind level should be hidden)
- [ ] Verify grind level is not saved when "Pre-ground" is selected
- [ ] Verify existing shots with regular grinders are unaffected
