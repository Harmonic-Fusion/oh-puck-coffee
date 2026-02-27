# Problem Statement

The Share button on the shot modals (ShotSuccessModal and ShotDetail) currently has a single share format. Users want the ability to choose between different share text lengths — from a quick summary to an absurdly detailed version — to match the context they're sharing in. A long-press on the Share button should reveal a menu with three format options.

# Scope

- **Where**: Both `ShotSuccessModal` (post-log) and `ShotDetail` (shot log detail view) share buttons.
- **Interaction**: Short click = share with default format (current "Puck Ya" format). Long press (≥500ms) = open a popover menu with three format choices.
- **Three share formats**:
  1. **Short Version** — Bean name, rating label, and share link. Compact for quick sharing.
  2. **Puck Ya Version** — The existing `buildShotShareText` output (current default). No changes to this format.
  3. **Ridiculous Long** — A verbose, over-the-top version with all available shot data, extra flowery descriptions, coffee humor/jokes, and dramatic flair.
- **Share mechanism**: After selecting a format, the resulting text is shared via Web Share API (if available) or copied to clipboard (existing fallback logic).
- **No backend changes**: All three formats are built client-side from existing `ShotShareData`.
- **No database changes**.

# Solution

## Architecture

Add a `ShareFormat` type (`"short" | "standard" | "ridiculous"`) to `src/lib/share-text.ts`. Create two new builder functions alongside the existing `buildShotShareText`:

1. **`buildShortShareText(shot, tempUnit)`** — Renders: bean name, rating label, and URL. ~2–3 lines.
2. **`buildRidiculousShareText(shot, tempUnit)`** — Renders the full existing text PLUS extra verbose descriptions of every field, coffee puns/jokes, dramatic commentary on extraction ratios, grind settings, etc. ~30+ lines.
3. **`buildShotShareText`** — Stays as-is (the "Puck Ya" standard).

Add a top-level dispatcher: `buildShareText(shot, tempUnit, format)` that routes to the correct builder.

## UI Component

Create a `ShareMenu` component (or inline the logic) that:
- Wraps the Share button.
- Tracks a long-press timer via `onPointerDown`/`onPointerUp`/`onPointerLeave`.
- On long press (≥500ms), shows a small popover/dropdown with the three options:
  - "☕ Short & Sweet"
  - "🤙 Puck Ya"
  - "🏆 Ridiculous"
- On short click, triggers the default "Puck Ya" share (existing behavior preserved).
- On menu item selection, calls the share flow with the selected format.
- Dismiss menu on outside click or Escape.

This approach was chosen over alternatives (e.g., a settings page for default format, or a separate share dialog) because:
- It preserves the existing single-tap UX for most users.
- The long-press gesture is discoverable but non-intrusive.
- No new routes, pages, or API endpoints needed.

# Tasks

## Phase 1: Share Text Builders

- [x] Add `ShareFormat` type to `src/lib/share-text.ts`
- [x] Create `buildShortShareText(shot, tempUnit)` in `src/lib/share-text.ts` — outputs bean name, rating, URL only
- [x] Create `buildRidiculousShareText(shot, tempUnit)` in `src/lib/share-text.ts` — outputs verbose text with all data fields, extra descriptions, jokes, dramatic flair
- [x] Add `buildShareText(shot, tempUnit, format)` dispatcher function that routes to the correct builder
- [x] Add tests for `buildShortShareText` in `src/lib/__tests__/share-text.test.ts`
- [x] Add tests for `buildRidiculousShareText` in `src/lib/__tests__/share-text.test.ts`

## Phase 2: Long-Press Share Menu UI

- [x] Create a `LongPressShareButton` component (or similar) that handles long-press detection and renders a popover menu with the three format options
- [x] Integrate `LongPressShareButton` into `ShotSuccessModal` — replace the current Share button
- [x] Integrate `LongPressShareButton` into `ShotDetail` — replace the current Share button
- [x] Ensure short click still triggers default "Puck Ya" share (existing behavior preserved)
- [x] Ensure menu dismisses on outside click and Escape key

