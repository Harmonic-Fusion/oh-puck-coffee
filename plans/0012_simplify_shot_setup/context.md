# Problem Statement

The shot log form has UX friction: beans are in the wrong section, the setup section is too verbose, "Previous Shot" implies only the most recent shot, dose/yield/actual yield are required but shouldn't be, and the previous shot section lacks proper collapse/expand controls. This feature simplifies the form by moving beans to Recipe, collapsing Setup to a summary, clarifying the "reference shot" concept, adding proper controls, and making most fields optional.

# Scope

- Move `BeanSelector` from SectionBasics ("Setup") into SectionRecipe ("Recipe")
- SectionBasics should show a collapsed summary: `{grinder name} · {machine name}`, expandable to change
- "Previous Shot" should be renamed/clarified as a "Reference Shot" — any shot, not just the most recent. Sourced from URL param `previousShotId` or `shotId`, or from the last shot, or user selection
- Add comments to PreviousShotRow and related code clarifying intent (any shot, not just most recent)
- Previous Shot section gets [View] button and [Chevron] for collapse/expand. Collapsed state shows only "Previous Shot" label + down chevron
- Make `doseGrams` and `yieldGrams` (target yield) optional in Zod schema, API validation, and DB schema
- Make `yieldActualGrams` (actual yield) optional in Zod schema, API validation, and DB schema
- Only required fields after changes: `beanId` and `rating`
- Beans remains the only required selector in the form

# Solution

## Move Beans to Recipe
Remove `BeanSelector` from `SectionBasics.tsx` and add it as the first item in `SectionRecipe.tsx`. Since SectionRecipe uses a configurable step system, beans should be rendered above the configurable steps as a fixed, always-visible element (not part of the toggleable step system, since it's required).

## Simplify Setup Section
Replace the current SectionBasics content (after removing beans) with a collapsed/expanded pattern:
- **Collapsed** (default when both grinder and machine are set): Show a single line `{grinder name} · {machine name}` with an expand button
- **Expanded**: Show the existing `GrinderSelector` and `MachineSelector` dropdowns
- If neither grinder nor machine is set, default to expanded so the user can set them up
- Use local component state for expand/collapse (no persistence needed)

## Clarify Previous Shot as Reference Shot
The "Previous Shot" concept already supports any shot via URL params — it's not limited to the most recent. Add JSDoc comments to `PreviousShotRow`, `useShotPrePopulation`, and related code explaining:
- This is a "reference shot to recreate" — any shot the user wants to base their new shot on
- It can come from URL params, session storage, or defaults to the most recent shot
- The name "Previous Shot" is a UI label, not a constraint on which shot can be selected

## Previous Shot Collapse/Expand Controls
Modify `PreviousShotRow` to support collapse/expand:
- **Collapsed**: Show "Previous Shot" label + down chevron icon button (no shot details)
- **Expanded**: Show current content (bean name, grinder, machine, badges, notes) + [View] button + up chevron icon button
- Default to expanded when a reference shot exists
- View button opens existing `ShotDetail` modal (already implemented)

## Make Fields Optional
### Schema (`src/shared/shots/schema.ts`)
- Change `doseGrams` from required positive number to optional (`.optional()`)
- Change `yieldGrams` from required positive number to optional (`.optional()`)
- Change `yieldActualGrams` from required positive number to optional (`.optional()`)

### Database (`src/db/schema.ts`)
- Change `doseGrams`, `yieldGrams`, `yieldActualGrams` columns to nullable (remove `.notNull()`)
- Generate idempotent migration

### API (`src/app/api/shots/route.ts`)
- Remove the extra `yieldActualGrams` presence check in POST handler
- Update `flowRate` computation to handle missing `yieldActualGrams` or `brewTimeSecs` (set to null if either is missing)

### Form
- Update `SectionRecipe` dose/yield NumberSteppers to not show validation errors when empty
- Update `SectionResults` actual yield NumberStepper similarly
- The yield ratio quick-select buttons should still work when dose is set

# Tasks

## Phase 1: Schema & API Changes (make fields optional)

- [x] Update `createShotSchema` in `src/shared/shots/schema.ts` — add `.optional()` to `doseGrams` (L7), `yieldGrams` (L8), `yieldActualGrams` (L15)
- [x] Update DB schema in `src/db/schema.ts` — remove `.notNull()` from `doseGrams` (L139), `yieldGrams` (L140), `yieldActualGrams` (L147)
- [x] Generate migration (`pnpm db:generate`), then edit SQL to add idempotent guards (`ALTER COLUMN ... DROP NOT NULL` wrapped in DO block)
- [x] Update POST handler in `src/app/api/shots/route.ts`:
  - Remove `yieldActualGrams` presence check (L294-300)
  - Update flowRate to guard on null `yieldActualGrams` (L302-307)
  - Update `String()` wrapping to handle null: `data.doseGrams != null ? String(data.doseGrams) : null` (L312-327)
- [x] Update PATCH handler in `src/app/api/shots/[id]/route.ts`:
  - Same flowRate null guard (L140-145)
  - Same `String()` null handling (L153-158)
- [x] Update `ShotEditForm.tsx` default values — handle optional doseGrams/yieldGrams like existing yieldActualGrams pattern (L40)

## Phase 2: Move Beans to Recipe & Simplify Setup

- [x] Remove `BeanSelector` from `SectionBasics.tsx` (L40-45)
- [x] Add `BeanSelector` as fixed first element in `SectionRecipe.tsx` — render before `orderedSteps.map()` (before L657), using same `useFormContext` pattern: `watch("beanId")`, `setValue("beanId", v, { shouldValidate: true })`
- [x] Refactor `SectionBasics.tsx` into a collapsible equipment summary:
  - Collapsed (default when grinder+machine set): single line `{grinderName} · {machineName}` + expand chevron
  - Expanded: existing GrinderSelector + MachineSelector dropdowns + collapse chevron
  - Use `useState` for toggle, auto-expand when no equipment selected
  - Use `ChevronDownIcon`/`ChevronUpIcon` from `@heroicons/react/24/outline`

## Phase 3: Previous Shot UX Improvements

- [x] Add collapse/expand to `PreviousShotRow.tsx`:
  - Collapsed: "Previous Shot" label + `ChevronDownIcon` button only (no details)
  - Expanded: current content + [View] button (existing) + `ChevronUpIcon` button
  - Default to expanded when reference shot exists
  - Use `useState` toggle pattern (same as TruncatedNotes)
- [x] Add JSDoc comments to `PreviousShotRow` and `useShotPrePopulation` (hooks.ts) clarifying:
  - This is a "reference shot to recreate" — any shot, not just most recent
  - Sources: URL param `previousShotId`/`shotId`, sessionStorage `duplicateShot`, or last shot from DB
  - "Previous Shot" is a UI label, not a constraint

# Additional Tasks

- [x] Put beans into the Change Recipe Inputs list
- [x] For Setup, when collapsed have it be one line and the entire line is a trigger to open. Down chevron is in line with the Title.