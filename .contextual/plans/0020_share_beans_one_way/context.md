# Problem Statement

Simplify bean sharing to a one-way model: owner creates beans and shares only by increasing access (None → Anyone with link). No public beans; no downgrade of access. Clarify duplicate options and who can add people (reshare vs general link).

# Scope

- **Bean general access:** Two levels only — None (restricted; add individuals only) and Anyone with link. No Public. Owner cannot decrease once increased; confirmation before increasing.
- **Duplicate bean:** Any user (including owner) can duplicate; options: migrate shots, duplicate shots, or no shots.
- **Shot-level sharing:** Per-user, change anytime. Options: No, Restricted, Anyone with link (no Public).
- **Who can add people:** Owner always. Non-owner only if owner granted "Allow Reshare" or bean is Anyone with link (link users add themselves). Only owner can enable Allow Reshare.

# Solution

Specification lives in `.contextual/context/bean-sharing.md`. All flows (invite, self-join, remove, unfollow, shot visibility, duplicate, reshare) updated to the simplified model. Implementation should follow that doc.

# Plan summary

Implementation is in three phases. **Phase 1** (general access): restrict schema/API to two levels, remove `public`; reject downgrade in general-access API; add confirmation UI before increasing. **Phase 2** (duplicate): duplicate API already supports migrate/duplicate/none for current user's shots and is available to any member; verify owner can use it and UI exposes all three options. **Phase 3** (shot sharing and reshare): remove `public` from shot history everywhere; enforce owner-only for `reshareAllowed` in PATCH shares; UI for shot options (no Public), reshare only to owner, and "add people" visibility per rules.

# Tasks

Implementation references `.contextual/context/bean-sharing.md`. Max 10 tasks, ordered by dependency.

## Phase 1: General access (no downgrade, no public)

- [x] **Schema and validation:** Restrict `beans.generalAccess` and request schemas to `restricted` and `anyone_with_link` only (remove `public`). New beans default to `restricted`. Update `src/db/schema.ts`, `src/shared/beans/schema.ts`, and any Zod enums that accept `public`.
- [x] **General-access API:** In `PATCH /api/beans/:id/general-access`, reject downgrade (request `generalAccess === "restricted"` when current value is `anyone_with_link`). Return 400 with a clear error code (e.g. `CANNOT_DOWNGRADE_GENERAL_ACCESS`). Remove or skip the call to `unshareSelfMembersOnRestricted` when downgrade is disallowed.
- [x] **Confirmation UI:** Before increasing to "Anyone with link", show a confirmation step explaining that people with the link can add themselves and log shots to this bean and that this cannot be undone. Hide or disable the option to downgrade from "Anyone with link" back to restricted.

## Phase 2: Duplicate bean

- [x] **Verify duplicate:** Confirm duplicate API (`POST /api/beans/:id/duplicate`) is available to any member including owner and supports all three `shotOption` values (`migrate`, `duplicate`, `none`) affecting only the current user's shots. Ensure bean detail UI exposes duplicate to owner and shows all three options; fix if not.

## Phase 3: Shot sharing and reshare rules

- [x] **Shot history without Public:** Remove `public` from `shotHistoryAccess` in `src/db/schema.ts`, `src/shared/beans/schema.ts`, `PATCH /api/beans/:id/share-my-shots` body schema, and any shot-visibility queries (e.g. `src/app/api/beans/[id]/shots/route.ts`, shares beans slug). Allow only `none`, `restricted`, `anyone_with_link`. Migrate or ignore existing `public` values when reading.
- [x] **Reshare owner-only:** In `PATCH /api/beans/:id/shares/:shareId`, allow only the bean owner to set `reshareAllowed`. Non-owners must receive 403 when attempting to change `reshareAllowed`. Non-owners may still update their own `shotHistoryAccess` on their share row.
- [x] **UI: reshare and add-people:** In the share dialog, show the "Allow Reshare" toggle only to the owner. Show "Add people" / invite controls to non-owners only when they have `reshareAllowed === true` or the bean's `generalAccess === "anyone_with_link"` (and they can share the link). Remove or hide "Public" from shot history options in the UI.

# Additional Tasks

- [x] Duplicate bean: add "(copy)" to the end of the duplicated bean's name.
- [x] On the share modal: remove the trash can by users' names (no more removing users). For the owner, change the edit to just a toggle button with "Allow Reshare" which automatically saves when changed.
- [x] Update @.contextual/context/bean-sharing.md if needed based on the new changes.
- [x] Share modal: put "Share my shot history" below the "My Shot History" section; remove the edit button next to the current user in "People with access".
- [x] Unfollow: remove the Unfollow button from the `/beans/:id` page.
