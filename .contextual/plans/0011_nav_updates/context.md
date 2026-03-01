# Problem Statement

The mobile navigation bar has several UX issues: the menu dropdown overlaps the nav bar instead of appearing above it and matching its design, the menu doesn't close when clicking a nav item or outside the dropdown, and several labels/icons need updating for clarity. Additionally, the shots page actions need to be sticky, and shot detail action buttons need icon updates.

# Scope

- Mobile bottom nav bar (`NavBar.tsx`): fix menu dropdown positioning, styling, and close behavior
- Nav bar label/icon changes: "Menu" → bars-3 icon only, "Log" → "Add" with circle-plus icon, "Dashboard" → "Stats"
- Shots page (`shots/page.tsx`): make the header/actions area sticky on mobile when scrolled
- New generic `ActionButtonBar` component: unify ShotCard and ShotDetail action buttons into a shared, data-driven component
- Shot detail modal (`ShotDetail.tsx`): refactor footer to use `ActionButtonBar`; update Hide (filled when visible), Reference (check-slash), Duplicate (circle-plus) icons
- Shots card (`shots/page.tsx`): refactor inline actions to use `ActionButtonBar`
- All icons use `@heroicons/react` (outline/solid variants)
- Dropdown menu component (`dropdown-menu.tsx`): fix close-on-item-click and outside-click behavior

# Solution

## 1. NavBar Menu Dropdown (NavBar.tsx)

**Menu button**: Remove "Menu" text label. Replace `EllipsisVerticalIcon` with `Bars3Icon`. Keep the button the same flex layout but icon-only.

**Dropdown positioning & design**: The `DropdownMenuContent` currently renders with `position: absolute` inside a `relative` div. It needs to:
- Render above the nav bar (use `side="top"` which is already set, but ensure the content floats above with proper `bottom` positioning)
- Match the nav bar's glassmorphism style: `bg-white/90 backdrop-blur-md border border-stone-200 dark:border-stone-700 dark:bg-stone-900/90`
- Be positioned to fill the container width or at minimum be well-aligned

**Close on nav item click**: The `DropdownMenuItem` calls `router.push()` but doesn't call `setOpen(false)`. The `DropdownMenu` component needs to close after an item is clicked. Update `DropdownMenuItem` in `dropdown-menu.tsx` to auto-close the menu on click, or wrap the `onClick` in `NavBar.tsx` to also close.

**Close on outside click**: The dropdown's `handleClickOutside` uses `triggerRef` but it's never assigned (always `null`). This means clicking outside may not properly close. Need to verify and fix. The current implementation in `dropdown-menu.tsx` has a `triggerRef` that's initialized as `useRef<HTMLElement | null>(null)` but never connected to the trigger button — this is a bug causing outside-click detection to fail.

## 2. Nav Label & Icon Changes (NavBar.tsx)

- Change `mobileNavItems` "Dashboard" label to `"Stats"` (keep `ChartBarIcon`)
- Change `mobileNavItems` "Log" label to `"Add"` and icon from `BeakerIcon` to `PlusCircleIcon`
- Menu trigger: icon-only with `Bars3Icon`, no `<span>Menu</span>`

## 3. Shots Page Sticky Actions (shots/page.tsx)

Make the header area (title + export button), selection bar, search, and filter bar sticky at the top when scrolling on mobile. Wrap these in a `sticky top-0 z-10 bg-white dark:bg-stone-950` container so they stay visible while scrolling through shot cards.

## 4. Generic ActionButtonBar Component

Currently, the ShotCard (in `shots/page.tsx`) and ShotDetail footer (in `ShotDetail.tsx`) duplicate action button logic with different implementations:
- **ShotCard**: Simple `<button>` elements with Heroicon components, `flex h-10 flex-1` layout, hover states
- **ShotDetail**: `<Button>` components with inline SVGs, variant/size props, `flex-1` layout

Create a generic `ActionButtonBar` component (`src/components/shots/ActionButtonBar.tsx`) that:

**Props interface:**
```
ActionButtonConfig = { key, icon (React component), onClick, title, variant?: 'default' | 'active', className? }
ShareButtonConfig = { key: 'share', shotData, tempUnit, getShareUrl, onShare }
ActionConfig = ActionButtonConfig | ShareButtonConfig
ActionButtonBarProps = { actions: ActionConfig[], className? }
```

**Design decisions:**
- Adopt the card's simpler button pattern (direct `<button>` with Tailwind) over the `<Button>` component — icon-only buttons don't need Button's text/loading features
- Parent controls icon state (e.g., `icon: shot.isReferenceShot ? StarIconSolid : StarIcon`)
- Share button detected by type discrimination (`key === 'share' && 'shotData' in config`) and renders `LongPressShareButton`
- Selection mode stays external — parent renders ActionButtonBar or placeholders
- Variant styling: `'default'` = stone colors, `'active'` = amber/filled

**Replaces in ShotCard:** The inline action buttons (~lines 200-250) become `<ActionButtonBar actions={[...]} />`
**Replaces in ShotDetail:** The footer `<div className="flex items-center gap-2">` becomes `<ActionButtonBar actions={[...]} />` with Edit added as a standard action using `PencilSquareIcon`

## 5. Shot Detail Icon Updates

Applied via the new ActionButtonBar with Heroicon components instead of inline SVGs:

**Hide button**: Inverted from current — filled eye (`EyeIcon` solid) when visible, outline eye-slash when hidden
**Reference icon**: Change from star to check-slash style (custom SVG or closest Heroicon)
**Duplicate icon**: Change from document-copy to `PlusCircleIcon`

## 6. Dropdown Menu Close Fix (dropdown-menu.tsx)

Fix the `DropdownMenuItem` to call `setOpen(false)` after its `onClick` handler runs. This ensures menu closes on item selection. Also fix the outside-click detection by properly connecting the trigger ref.

# Tasks

## Phase 1: NavBar Updates

- [x] Replace Menu trigger icon with `Bars3Icon` and remove "Menu" text label
- [x] Rename "Dashboard" to "Stats" in `mobileNavItems`
- [x] Rename "Log" to "Add" and change icon to `PlusCircleIcon` in `mobileNavItems`
- [x] Update `DropdownMenuContent` styling in NavBar to match nav bar glassmorphism design
- [x] Fix dropdown positioning to appear above nav bar properly within the container

## Phase 2: Dropdown Menu Close Behavior

- [x] Fix `DropdownMenuItem` to auto-close menu on click via context
- [x] Fix outside-click detection by properly connecting trigger ref to the trigger button

## Phase 3: Shots Page Sticky Actions

- [x] Wrap header, selection bar, search, and filter bar in a sticky container on mobile
- [x] Ensure proper background and z-index so content scrolls beneath

## Phase 4: ActionButtonBar Component & Icon Updates

- [x] Create `ActionButtonBar` component in `src/components/shots/ActionButtonBar.tsx` with `ActionConfig` / `ShareButtonConfig` type discrimination
- [x] Refactor ShotCard actions in `shots/page.tsx` to use `ActionButtonBar`
- [x] Refactor ShotDetail footer in `ShotDetail.tsx` to use `ActionButtonBar` (replace inline SVGs with Heroicons)
- [x] Update Hide icon: solid `EyeIcon` when visible, outline `EyeSlashIcon` when hidden
- [x] Update Reference icon from star to check-slash style
- [x] Update Duplicate icon from document-copy to `PlusCircleIcon`
