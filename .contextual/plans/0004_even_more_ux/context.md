# Problem Statement

The shot logging form has several UX friction points: "Add New" dialogs for Bean/Grinder/Machine don't carry over the user's search text, Tab/Enter navigation skips fields and jumps to Notes instead of following the natural order, input/quick-select sizing is inconsistent, the Brew Timer play/pause button is cramped inline, the Recipe QR Code action is buried outside the menu dropdown, "Log Another" after a successful shot doesn't scroll to the Recipe section, "View Shot" from the previous shot row is broken, and the Previous Shot summary doesn't show which Bean, Grinder, or Machine were used.

Additionally, the seed script (`src/db/seed.ts`) is located inside the `src/db/` directory but should live in `scripts/` alongside other standalone scripts. The script also blindly inserts default data without checking if it already exists, and `DEFAULT_TOOLS` is defined in a separate shared constants file when it's only used by the seed script.

# Scope

- **Prepopulate "Add New" dialogs**: When a user types in the Bean, Grinder, or Machine `SearchableSelect` and clicks "+ Add New", the search text must be passed to the creation form and used as the initial name value.
- **Fix Tab/Enter field order**: Tab and Enter must advance focus through fields in visual order: Dose → Target Yield → Grind Level → Brew Temp → Brew Pressure → Pre-infusion → ... → Actual Yield → Brew Time → Est. Max Pressure → Shot Quality → Rating → Notes. Must work correctly across the Recipe and Results sections, respecting the user-configured step ordering and visibility.
- **Resize inputs and quick-select buttons**: All `NumberStepper` value displays and control buttons, `SearchableSelect` trigger buttons, and `BrewTimer` button should use `h-16`. All quick-select buttons (Dose, Ratio, Pressure, Time presets) should use `h-8`.
- **Brew Timer button relayout**: Move the play/pause `BrewTimer` button from its current inline position (as `extraButtons` within the `NumberStepper` row) to a full-width `h-16` button rendered below the Brew Time `NumberStepper`.
- **Recipe QR Code in menu dropdown**: Remove the standalone QR Code button from the computed preview area at the bottom of the Recipe section and add a "Recipe QR Code" menu item inside the existing recipe dropdown menu (next to "Edit Order").
- **"Log Another" scrolls to Recipe section**: After a successful shot, clicking "Log Another" in `ShotSuccessModal` should scroll the page to the Recipe section instead of the top of the page. Since bean/grinder/machine are pre-populated from the last shot, the user wants to skip directly to Recipe.
- **Fix "View Shot" and ensure shot sharing**: The "View Shot" button in `PreviousShotRow` (which opens `ShotDetail` as a modal inside `ShotForm`) is broken — needs investigation and fix. Additionally, ensure sharing a particular shot works correctly from the `ShotDetail` modal (share link creation via `useCreateShareLink` + Web Share API / clipboard fallback).
- **Previous Shot shows equipment context**: The `PreviousShotRow` should display the Bean name, Grinder name, and Machine name (when present) so the user can see what equipment was used. The data is already available on `ShotWithJoins` (`beanName`, `grinderName`, `machineName`); it just needs to be rendered.
- **Move seed script to `scripts/`**: Relocate `src/db/seed.ts` to `scripts/seed.ts`, update `db:seed` in `package.json`, move `DEFAULT_TOOLS` from `src/shared/equipment/constants.ts` into the seed script alongside `DEFAULT_GRINDERS` and `DEFAULT_MACHINES`, and have the script query existing rows before inserting so it skips already-seeded data.
- No database or schema changes required. The share API (`/api/shares`) already exists.
- UI changes are confined to UI components only; the seed script change is a standalone script refactor.

# Solution

## 1. Prepopulate "Add New" dialogs

Change `SearchableSelect.onAddNew` callback signature from `() => void` to `(searchText: string) => void`. In the "+ Add New" button's `onClick`, capture `searchQuery` **before** calling `setSearchQuery("")` and `setIsOpen(false)` (which clear it), then pass it to `onAddNew`. In each selector component:

- **`BeanSelector`**: Change `onAddNew={() => setShowCreate(true)}` → `onAddNew={(text) => { setNewName(text); setShowCreate(true); }}` (line 243).
- **`GrinderSelector`**: Change `onAddNew={() => setShowCreate(true)}` → `onAddNew={(text) => { setNewName(text); setShowCreate(true); }}` (line 59).
- **`MachineSelector`**: Same pattern as GrinderSelector (line 59).

No new state needed — just threading the existing search text.

## 2. Fix Tab/Enter field order

The current `focusNextField` in `NumberStepper` (line 205) queries the DOM for `[tabindex="0"]`, inputs, textareas, selects, and `[role="slider"]`. Audit confirms:
- `NumberStepper` value display `div[role="textbox"][tabindex="0"]` — correct, these are the primary Tab stops.
- `SearchableSelect` trigger `<button>` — defaults to `tabIndex={0}` (natural), correct for Setup section.
- Quick-select buttons — all have `tabIndex={-1}` ✅.
- `Slider` components — have `[role="slider"][tabindex="0"]` for Shot Quality/Rating.
- `Textarea` (Notes) — natural `<textarea>` tab stop.
- Labels in `BeanSelector`, `GrinderSelector`, `MachineSelector` — have `tabIndex={-1}` ✅.
- `NumberStepper` decrement/increment buttons — have `tabIndex={-1}` ✅.
- `BrewTimer` button — has `tabIndex={-1}` ✅.
- `BeanSelector` "Edit" button — has `tabIndex={-1}` ✅.

Remaining issue: `focusNextField` uses `containerRef.current.closest("form")` to find focusable elements. The selector string picks up any `input:not([tabindex="-1"]):not([disabled])` — this may capture the `NumberStepper` hidden `<input type="number">` inside the editing overlay (line 283) or `SearchableSelect`'s search `<input>` inside the dropdown. Need to verify these aren't interfering.

Fix approach: If the hidden inputs interfere, add `tabIndex={-1}` to the `NumberStepper` edit input and `SearchableSelect` search input so they're skipped by `focusNextField`. The edit input should only gain focus when editing mode is active (already handled by `startEditing`). The search input should only gain focus when the dropdown opens (already handled by `setTimeout(() => inputRef.current?.focus(), 0)`).

## 3. Resize inputs and quick-select buttons

Files with `h-14` that need changing to `h-16`:
- `NumberStepper.tsx` — value display div (line 274: `h-14`), decrement button (line 339: `h-14 w-14`), increment button (line 349: `h-14 w-14`) → 3 instances of `h-14`, 2 instances of `w-14` on buttons
- `SearchableSelect.tsx` — trigger button (line 90: `h-14`)
- `BrewTimer.tsx` — play/pause button (line 53: `h-14 w-14`) → will become `w-full h-16` in Phase 4
- `Input.tsx` — input element (line 27: `h-14`)
- `Select.tsx` — select element (line 37: `h-14`)

Quick-select buttons currently use `rounded-lg px-2.5 py-1 text-xs font-medium` — add `h-8` to each:
- `SectionRecipe.tsx`: Dose presets (line 329), Ratio presets (line ~370), Pressure presets (line ~494)
- `SectionResults.tsx`: Time presets (line 217), Pressure presets (line ~262)

## 4. Brew Timer button relayout

- In `SectionResults` `brewTime` case, remove `extraButtons` prop from `NumberStepper` and render `BrewTimer` as a separate element below the stepper.
- Update `BrewTimer` to accept optional `className` prop and render as full-width `h-16` with centered content (icon + text label: "Start Timer" / "Pause").

## 5. Recipe QR Code in menu dropdown

- Remove the computed preview `<div>` block at lines 646–675 of `SectionRecipe.tsx` (contains the QR Code `<Button>`).
- Add "Recipe QR Code" menu item inside the `{showMenu && ...}` dropdown (line 620), alongside "Edit Order", that calls `setShowQRCode(true)` and `setShowMenu(false)`.
- Keep the QR Code Modal unchanged.

## 6. "Log Another" scrolls to Recipe section

In `ShotSuccessModal` (line 242), "Log Another" calls `router.push(AppRoutes.log.path)`. Change to `router.push(AppRoutes.log.path + "#recipe")`. Add `id="recipe"` to the `<section>` element in `SectionRecipe` (line 594).

## 7. Previous Shot shows Bean, Grinder, Machine

`ShotWithJoins` already has `beanName`, `grinderName`, `machineName`. In `PreviousShotRow`, add an equipment subtitle line between the heading row and `ShotBadges`. Join non-null names with ` · ` separator, styled as `text-sm text-stone-600 dark:text-stone-400`.

## 8. Fix "View Shot" and shot sharing

The flow: `PreviousShotRow` → `onViewShot(shot)` → `ShotForm.setSelectedShot(shot)` → `ShotDetail` opens with `open={!!selectedShot}`. The `ShotDetail` guard `if (!shot) return null` (line 90) runs before the Modal, but `open` and `shot` are synced in `ShotForm`, so this guard alone shouldn't prevent rendering.

Investigation targets:
1. Check if `GET /api/shots/[id]` returns the full joined data (`beanName`, `grinderName`, `machineName`, `userName`) that `ShotDetail` expects.
2. Check if `useShot(shotId)` in `PreviousShotRow` is returning `undefined` or a partial object.
3. Check if `FormProvider` wrapping causes issues with `ShotDetail` being rendered inside the form (Modal portals to body, so this shouldn't matter).

For sharing, the infrastructure exists (`useCreateShareLink`, `buildShotShareText`, Web Share API + clipboard fallback). Verify the `handleShare` callback in `ShotDetail` (line 144) correctly creates the share link and the resulting URL is valid.

## 9. Move seed script to `scripts/` and make idempotent

The seed script currently lives at `src/db/seed.ts` and uses `onConflictDoNothing` for inserts. The user wants:

1. **Move to `scripts/seed.ts`** — alongside other standalone scripts (`migrate.ts`, `db-export.ts`, etc.). Update the `db:seed` script in `package.json` from `tsx src/db/seed.ts` to `tsx scripts/seed.ts`.

2. **Check before inserting** — instead of blindly inserting and relying on `onConflictDoNothing`, query existing grinders/machines/tools first, then only insert the ones that don't already exist. Log which items are new vs. already present.

3. **Move `DEFAULT_TOOLS` into the seed script** — `DEFAULT_TOOLS` is defined in `src/shared/equipment/constants.ts` but is only used by the seed script (verified: no other file imports it except via the barrel `src/shared/index.ts`, and nothing imports from that barrel). Move the array into the seed script alongside `DEFAULT_GRINDERS` and `DEFAULT_MACHINES`. Remove `src/shared/equipment/constants.ts` and its re-export from `src/shared/index.ts`.

4. **Keep the cleanup logic** — the tamper deletion and distribution-tool rename should remain, also guarded by existence checks.

# Tasks

## Phase 1: Prepopulate "Add New" with search text

- [x] In `SearchableSelect`, change `onAddNew` prop from `() => void` to `(searchText: string) => void`; in the onClick handler, capture `searchQuery` before clearing and pass to `onAddNew`
- [x] In `BeanSelector`, `GrinderSelector`, `MachineSelector`: update `onAddNew` callbacks to receive the search text and set it as `newName` before showing the create form/modal

## Phase 2: Fix Tab/Enter field navigation order

- [x] Audit and fix tab-stop interference: add `tabIndex={-1}` to `NumberStepper`'s edit `<input>` (line 283) and `SearchableSelect`'s search `<input>` (line 114) so they don't appear in `focusNextField`'s query results
- [x] Test Tab/Enter traversal: Dose → Target Yield → Grind Level → Brew Temp → Brew Pressure → Pre-infusion → Actual Yield → Brew Time → Est. Max Pressure → Shot Quality → Rating → Notes (implementation verified: hidden inputs have `tabIndex={-1}`, `focusNextField` queries focusable elements in DOM order, respects user-configured field order and visibility)

## Phase 3: Resize inputs (`h-16`) and quick-selects (`h-8`)

- [x] Change `h-14` → `h-16` (and `w-14` → `w-16` on buttons) in `NumberStepper.tsx`, `SearchableSelect.tsx`, `BrewTimer.tsx`, `Input.tsx`, `Select.tsx`
- [x] Add `h-8` to all quick-select buttons in `SectionRecipe.tsx` (Dose, Ratio, Pressure) and `SectionResults.tsx` (Time, Pressure)

## Phase 4: Brew Timer relayout

- [x] Remove `extraButtons` from Brew Time `NumberStepper` in `SectionResults`; render `BrewTimer` as a full-width `h-16` button below the stepper with icon + text label

## Phase 5: Move Recipe QR Code to menu dropdown

- [x] Remove computed-preview wrapper div (lines 645–675) from `SectionRecipe`; add "Recipe QR Code" menu item inside the dropdown menu

## Phase 6: Previous Shot shows Bean, Grinder, Machine

- [x] In `PreviousShotRow`, add equipment subtitle showing `beanName · grinderName · machineName` between heading and badges

## Phase 7: "Log Another" scrolls to Recipe + fix "View Shot"

- [x] Add `id="recipe"` to `SectionRecipe`'s `<section>` element; change "Log Another" in `ShotSuccessModal` to navigate to `/log#recipe`
- [x] Investigate and fix "View Shot" from `PreviousShotRow` → `ShotDetail` modal; verify sharing works from `ShotDetail`

## Phase 8: Move seed script to `scripts/` and make idempotent

- [x] Move `src/db/seed.ts` to `scripts/seed.ts`; update `db:seed` in `package.json` to `tsx scripts/seed.ts`
- [x] Move `DEFAULT_TOOLS` array from `src/shared/equipment/constants.ts` into `scripts/seed.ts` alongside `DEFAULT_GRINDERS` and `DEFAULT_MACHINES`
- [x] Remove `src/shared/equipment/constants.ts` and its re-export line from `src/shared/index.ts`
- [x] Refactor seed logic to query existing grinders, machines, and tools first, then only insert missing items — log skipped vs. newly inserted counts

# Additional Tasks

- [x] Increase font size of numbers on Quality and Rating sliders: badge `text-sm` → `text-lg font-bold`, tick numbers `text-xs` → `text-sm font-medium`
- [x] Grind Level is not required field. Can be blank

## Phase 9: Recipe QR Code — hide URL and add styled rendering

### Problem

The Recipe QR Code modal currently displays the raw URL below the QR code, which is unnecessary visual clutter. Additionally, the QR code itself renders as plain black squares — the reference implementation in `unity_fusion_signin/components/qr-code-fluid.tsx` uses `react-qrcode-logo` with dot-style rendering and custom rounded eye corners for a more polished look.

### Scope

- **Hide the URL**: Remove the `<p className="text-xs font-mono ...">` element that displays `{recipeQRUrl}` below the QR code in the Recipe modal (`SectionRecipe.tsx` lines 668–672).
- **Switch QR library**: Replace `qrcode.react` (`QRCodeSVG`) with `react-qrcode-logo` (`QRCode` from `react-qrcode-logo`) in the `QRCode` component (`src/components/common/QRCode.tsx`). This enables `qrStyle="dots"` and `eyeRadius` props.
- **Add eye radius styling**: Adopt the same rounded-corner eye pattern from the reference file:
  - `eyeRadius0`: outer `[35, 0, 0, 0]`, inner `[5, 0, 0, 0]` (top-left)
  - `eyeRadius1`: outer `[0, 35, 0, 0]`, inner `[0, 5, 0, 0]` (top-right)
  - `eyeRadius2`: outer `[0, 0, 0, 35]`, inner `[0, 0, 0, 5]` (bottom-left)
- **Dot style**: Use `qrStyle="dots"` for rounded module rendering.
- **All QR Code usages benefit**: The styling changes are in the shared `QRCode` component, so the Recipe QR Code, Duplicate Shot QR Code (`ShotDetail`), and Settings app URL QR Code will all get the improved look.

### Solution

1. Install `react-qrcode-logo` as a dependency (`pnpm add react-qrcode-logo`).
2. In `src/components/common/QRCode.tsx`:
   - Replace `import { QRCodeSVG } from "qrcode.react"` with `import { QRCode as QRCodeLogo } from "react-qrcode-logo"`.
   - Replace the `<QRCodeSVG ... />` render with `<QRCodeLogo ... />` using props: `qrStyle="dots"`, `eyeRadius={[eyeRadius0, eyeRadius1, eyeRadius2]}`, `eyeColor={{ outer: fgColor, inner: fgColor }}`, `quietZone={0}`, and mapped `logoImage` settings.
   - Keep all existing responsive sizing, color, and error-handling logic.
3. In `SectionRecipe.tsx`, remove the URL display `<div className="text-center">` block (lines 668–672).
4. Optionally remove `qrcode.react` from `package.json` if no other code depends on it.

### Tasks

- [x] Install `react-qrcode-logo` package
- [x] Refactor `src/components/common/QRCode.tsx` to use `react-qrcode-logo` with dot style and rounded eye corners
- [x] Remove the URL text from the Recipe QR Code modal in `SectionRecipe.tsx`
- [x] Remove `qrcode.react` from dependencies if unused elsewhere

## Phase 10: Fix React hooks order violation in ShotDetail

### Problem

`ShotDetail` component throws a console error: "React has detected a change in the order of Hooks called by ShotDetail." This occurs because the `useCallback` hook for `handleShare` (line 144) is placed **after** an early return `if (!shot) return null;` (line 90). When `shot` transitions from `null` to a value, hook #29 goes from `undefined` to `useCallback`, violating React's Rules of Hooks.

The stack trace confirms the error originates in `ShotDetail` (at `src/components/shots/log/ShotDetail.tsx:144:34`).

### Root Cause

In `ShotDetail.tsx`:
- Lines 52–88: Hooks are called (useRouter, useTools, useMemo, useState×3, useCreateShareLink, useShot, useEffect)
- Line 90: `if (!shot) return null;` — early return before remaining hooks
- Line 144: `const handleShare = useCallback(...)` — hook called after the early return

When `shot` is `null`, the component returns at line 90 and `useCallback` is never reached. When `shot` becomes non-null, `useCallback` executes, changing the hook call order.

### Solution

Move the `handleShare` `useCallback` (lines 144–204) above the early return on line 90. The callback references `shot.id`, `shot.beanName`, etc., but these can be guarded internally with a null check or by reading from a local variable that defaults to empty values. Since `handleShare` is only invoked from the footer button (which is only rendered when `shot` is non-null), the null path inside the callback will never actually execute — it just needs to be there to satisfy TypeScript.

Specifically:
1. Move `const handleShare = useCallback(async () => { ... }, [shot, createShareLink]);` to just after the `useEffect` block (before line 90).
2. Add an early `if (!shot) return;` guard at the top of the callback body.
3. Update the dependency array to `[shot, createShareLink]` (it already uses `shot.id` and `createShareLink`).

No other hooks are placed after the early return, so this single move fixes the violation.

### Tasks

- [x] Move `handleShare` `useCallback` from line 144 to above the `if (!shot) return null;` guard on line 90, adding an internal null check for `shot`

## Phase 11: Make QR code eye corners fully circular

### Problem

The QR code eye (position detection pattern) outer rings are rounded (`[45, 45, 45, 45]`) but the inner "pupils" use `[5, 5, 5, 5]`, making them nearly square. Both outer and inner should be fully round circles.

### Solution

In `src/components/common/QRCode.tsx`, increase the inner eye radius for all three `eyeRadius0/1/2` from `[5, 5, 5, 5]` to `[45, 45, 45, 45]` so both the outer ring and inner pupil render as circles. The outer values are already correct at `[45, 45, 45, 45]`.

### Tasks

- [x] Change `eyeRadius0/1/2` inner from `[5, 5, 5, 5]` to `[45, 45, 45, 45]` in `QRCode.tsx` (outer already `[45, 45, 45, 45]` — no change needed)

## Phase 11: Make Tools Used non-collapsible

- [x] Remove collapsible button/toggle from Tools Used in `SectionRecipe.tsx`; render `ToolSelector` directly without expand/collapse wrapper
- [x] Remove unused `toolsExpanded` state, `TOOLS_EXPANDED_KEY`, `getSavedToolsExpanded`, and `saveToolsExpanded` helpers

## Phase 12: Extract shared dot-env loader into `src/lib/dot-env.ts`

### Problem

The `.env` file loading logic (read `.env.local` / `.env`, parse `KEY=VALUE` lines, skip comments/blanks, strip quotes, set into `process.env` if not already present) is copy-pasted verbatim across 4 files:
- `scripts/seed.ts` (lines 7–22)
- `scripts/migrate.ts` (lines 16–33)
- `scripts/db-export.ts` (lines 19–36)
- `drizzle.config.ts` (lines 5–19)

This violates DRY and makes the parsing logic error-prone to update.

### Scope

- Create `src/lib/dot-env.ts` with two exported functions.
- The module must work in standalone `tsx` scripts (Node.js only — no Next.js runtime required). It uses only `node:fs` (synchronous `readFileSync`).
- **No changes** to the Next.js app runtime — this is only for standalone scripts and config files.

### Solution

Create `src/lib/dot-env.ts` with:

1. **`readDotEnv(files?: string[]): Record<string, string>`**
   - `files` defaults to `[".env.local", ".env"]`.
   - For each file, read synchronously via `readFileSync`, parse lines, skip blanks/comments, split on first `=`, trim key and value, strip surrounding quotes from value.
   - Returns a merged `Record<string, string>` (first file wins for duplicate keys, matching current behavior where earlier files take precedence because of the `if (!process.env[key])` guard).
   - Does **not** mutate `process.env` — purely returns the parsed object.

2. **`readEnv<T extends z.ZodType>(schema: T, files?: string[]): z.infer<T>`**
   - Calls `readDotEnv(files)` to get raw key-value pairs.
   - Merges with `process.env` (process.env takes precedence, matching existing behavior where env vars already set are not overwritten).
   - Picks only the keys present in the Zod schema (using `schema.safeParse`).
   - Returns the parsed and validated result. Throws on validation failure with a clear error listing missing/invalid keys.

After creating the utility, replace the inline `.env` loading blocks in all 4 consumer files with a call to `readDotEnv()` or `readEnv(schema)`.

### Tasks

- [x] Create `src/lib/dot-env.ts` with `readDotEnv(files?)` that parses `.env` files and returns `Record<string, string>`
- [x] Add `readEnv(schema, files?)` that merges dot-env values with `process.env`, validates against a Zod schema, and returns the typed result
- [x] Replace inline `.env` loading in `scripts/seed.ts` with `readEnv` (removes 22-line inline block + CONFIG validation)
- [x] Replace inline `.env` loading in `scripts/migrate.ts` with `loadDotEnv()` (process.env used throughout)
- [x] Replace inline `.env` loading in `scripts/db-export.ts` with `readEnv` (removes 22-line inline block + CONFIG validation)
- [x] Replace inline `.env` loading in `drizzle.config.ts` with `loadDotEnv()` (process.env used for Railway checks)
