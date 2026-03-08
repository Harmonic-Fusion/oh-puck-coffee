# Problem Statement

The beans sharing feature has grown organically across two parallel tables (`user_beans` for collection membership, `beans_share` for individual shares) with inconsistent semantics—ownership lives in `beans.created_by`, collection membership in `user_beans`, and sharing in `beans_share`. Shot sharing similarly splits across a `shot_shares` table and a `userBeans.shareMyShotsPublicly` boolean. This duplication creates complexity in queries, auth checks, and UI logic. The refactor unifies participation into a single `beans_share` table where every participant (including the owner) has exactly one row, and replaces `shot_shares` with a simple `share_slug` on the `shots` table.

# Scope

All user flows, edge cases, and access rules are defined in `.contextual/context/bean-sharing.md` (the **source of truth** for behavioral requirements). This section covers structural and technical requirements only.

## Schema Changes

1. **Eliminate `user_beans` table** — migrate `open_bag_date` → `beans_share.beans_open_date`; all collection queries use `beans_share`.
2. **Eliminate `shot_shares` table** — migrate share IDs → `shots.share_slug`; shot share links use `shots.share_slug` directly.
3. **Remove legacy columns from `beans`**: `origin`, `roaster`, `created_by`, `general_access_share_shots`. Add `updated_at`, `updated_by`.
4. **Expand `beans_share.status`** from `pending | accepted` → `owner | pending | accepted | self | unfollowed`.
5. **Replace `beans_share.shareShotHistory` boolean** with `shot_history_access` enum (`restricted | anyone_with_link | public`). **UI must offer all three options** in the "Share my shot history" control: **Restricted**, **Anyone with the link**, **Public**. Semantics: **Restricted** = shot history visible only to people who have access (other bean members). **Anyone with the link** = any authenticated user who has the link (not limited to other members). **Public** = visible on the public share page including to unauthenticated users.
6. **Rename `beans_share.reshareEnabled`** → `reshare_allowed`.
7. **Add `beans_share.beans_open_date`** and `beans_share.updated_at`.
8. **Add `shots.share_slug`** (nullable, unique) for individual shot sharing.
9. **Add `user_entitlements.deleted_at`** for soft-delete tracking.

## Business Rules

All rules reference flows defined in `bean-sharing.md`:

10. **Recursive unsharing** — owner removes a member → all descendants (invited_by chain) also unshared (Flow 5).
11. **Voluntary unfollow** — re-parents descendants to owner, sets `status = 'unfollowed'` + `unsharedAt` (Flow 6).
12. **Access-level transitions** — downgrading `general_access` from `anyone_with_link` or `public` → `restricted` unshares all `self`-status members. Toggle back does NOT auto-restore (Flow 7).
13. **Shot visibility** — per-member `shot_history_access` controls who sees their shots. Unshared members' shots excluded from shared view (Flow 8). **Restricted**: only other bean members (people with access) see this member's shots. **Anyone with the link**: any authenticated user who has the bean share link can see this member's shots. **Public**: visible on public share page (including unauthenticated).
14. **Re-invite / re-follow** — clears `unsharedAt` and updates status; pending + follow via link = auto-accept (Flows 1–3).
15. **Decline invite** — hard-deletes the `beans_share` row (Flow 2).
16. **Duplicate bean** — creates an independent copy with three shot-handling options: duplicate (copy), migrate (move), or none (Flow 9).
17. **Max bean shares limit** — only counts direct invites (`invited_by = current user`, status ≠ `owner`). Public/link access does not count.
18. **Bean editing permissions** — owner-only, enforced in both UI and API.
19. **Resharing** — members with `reshare_allowed = true` can invite others; their downstream invitees are recursively unshared if the resharer is removed (Flow 10).
20. **General access = "Anyone with the link"** — when `general_access` is `anyone_with_link`, the owner has no discrete member list to remove; removal is meaningless. **UI:** Mute the trash (remove) icon for the owner and show an alert if they click it (e.g. explain that with link sharing anyone with the link has access and they can restrict access by changing general access to "Only people added" if they want to remove people). For edit/reshare: when access is "anyone with the link", everyone with the link can effectively reshare by sharing the link; no explicit reshare control is required in the UI.

## Boundaries

- No changes to authentication (Auth.js), billing (Stripe), or entitlement *infrastructure* — only the `bean-share` entitlement semantics may be updated.
- Origins/roasters lookup tables unchanged.
- Equipment tables unchanged.
- The public shared-bean page (`/share/beans/:slug`) stays but its data source changes.
- Users are soft-deleted (preserves `invited_by` chain for recursive unsharing).

## Dependencies

- Drizzle ORM migration system
- Existing production data in `user_beans`, `shot_shares`, and `beans_share` must be preserved via data migration
- `bean-share` entitlement gates creating shares and enabling `reshare_allowed`

# Solution

## Why this approach

Unifying `user_beans` and `beans_share` into a single table with a richer status enum (`owner | pending | accepted | self | unfollowed`) eliminates redundant joins, simplifies auth checks, and makes the participation model self-documenting. Similarly, `shot_shares` is unnecessary when a nullable `share_slug` column on `shots` achieves the same result with zero joins. The `shot_history_access` enum replaces two separate boolean mechanisms with a single per-member control matching the three access tiers. Ownership becomes just another participation type (`status = 'owner'`), making the data model uniform.

## Data migration strategy

Single idempotent SQL: (1) add new columns/tables, (2) migrate `user_beans` → `beans_share` (owner rows from `beans.created_by`, self rows from remaining entries), (3) migrate `shot_shares.id` → `shots.share_slug`, (4) drop old tables/columns.

## Impact analysis

See task descriptions in Phases 4–5 for the full file list. Key areas: `src/db/schema.ts`, `src/shared/beans/schema.ts`, `src/lib/beans-access.ts`, 14 API route files, 4 component files.

# Tasks

Behavioral requirements for all flows referenced below are defined in `.contextual/context/bean-sharing.md`.

## Phase 1: Schema & Migration

- [x] 1.1 Update Drizzle schema — all table changes per Scope items 1–9
- [x] 1.2 Generate & edit idempotent migration — data migration per Solution

## Phase 2: Shared Types & Validation

- [x] 2.1 Update Zod schemas — `beanSchema`, share schemas, `updateGeneralAccessSchema`

## Phase 3: Auth & Sharing Helpers

- [x] 3.1 Refactor `canAccessBean` — consolidate to `beans_share` only
- [x] 3.2 Implement sharing helpers — recursive unsharing, access-level transition

## Phase 4: API Routes — Existing

- [x] 4.1 Bean CRUD & sharing routes (7 files)
- [x] 4.2 Shot sharing & public routes (7 files)

## Phase 5: Components, Hooks & Cleanup

- [x] 5.1 Hooks & components — field renames, new status enum, `shotHistoryAccess` control
- [x] 5.2 Cleanup — dead `userBeans`/`shotShares` imports and removed column references

## Phase 6: API Tests — Sharing Lifecycle (Flows 1–3, 10)

Test-first for all sharing lifecycle endpoints. Pattern: Vitest + mock db queue (see `shares-permissions.test.ts`).

- [x] 6.1 **Bean creation → owner row** — `POST /api/beans` creates `beans_share` with `status = 'owner'`, correct fields
- [x] 6.2 **Direct invite** — `POST /api/beans/:id/shares`: creates pending share; duplicate prevention (active row → return existing); re-invite of unshared user (clears `unsharedAt`, sets `accepted`, no pending step); `reshareAllowed` requires entitlement; max shares limit (direct invites only)
- [x] 6.3 **Accept invite** — `POST /api/beans/:id/shares/:shareId/accept`: `pending` → `accepted`, no `user_beans` insert
- [x] 6.4 **Decline invite** — `DELETE` on pending share: hard-delete, no row remains
- [x] 6.5 **Self-join** — `POST /api/beans/:id/add-to-collection`: creates `self` row (`invitedBy = null`); re-follow of unshared user (clears `unsharedAt`, sets `self`); re-follow of unfollowed user (clears `unsharedAt`, sets `self`); pending invite + follow = auto-accept (no duplicate row); already-active row → return existing
- [x] 6.6 **Resharing** — member with `reshareAllowed = true` invites another (`invitedBy` = member); resharer unshared → descendants recursively unshared; reshare of previously-unshared user clears `unsharedAt`

## Phase 7: API Tests — Removal, Unfollow & Access Control (Flows 5–7)

- [x] 7.1 **Owner removes member** — `DELETE /api/beans/:id/shares/:shareId` (owner-initiated): sets `unsharedAt`, sets `reshareAllowed = false`, recursive unsharing of descendants via `invitedBy` chain. Removed member's shots remain but excluded from shared view (`unsharedAt IS NULL` filter)
- [x] 7.2 **Voluntary unfollow** — pending → hard delete; accepted/self → `status = 'unfollowed'` + `unsharedAt` set; descendants re-parented to owner (`invitedBy` updated). Re-follow via share link restores access (clears `unsharedAt`, sets `self`)
- [x] 7.3 **General access transitions** — `anyone_with_link` → `restricted`: all `self` members unshared. `public` → `restricted`: same. `public` → `anyone_with_link`: no member changes. Toggle back does NOT auto-restore unshared `self` members
- [x] 7.4 **Re-invite/re-follow after removal** — removed user re-follows via link (clears `unsharedAt`, status = `self`); owner re-invites removed user (clears `unsharedAt`, status = `accepted`, no pending step)

## Phase 8: API Tests — Shot Visibility & Duplicate Bean (Flows 4, 8, 9)

- [x] 8.1 **Shot visibility rules** — user sees own shots + shots of accepted members with `shotHistoryAccess != 'restricted'` and `unsharedAt IS NULL`. Unshared members' shots excluded. All members `restricted` → only own shots. (Extends existing `shot-history-visibility.test.ts`)
- [x] 8.2 **Shot history access toggle** — member updates `shotHistoryAccess` between `restricted | anyone_with_link | public`. Public page stats: `public` members only. Authenticated view: `anyone_with_link` + `public` members
- [x] 8.3 **Public share page** — `GET /api/shares/beans/:slug`: stats from members with `shotHistoryAccess = 'public'` only. Unauthenticated access when `generalAccess = 'public'`. 403 when `generalAccess = 'restricted'` and user is not a member
- [x] 8.4 **Duplicate bean** — `POST /api/beans/:id/duplicate`: three shot options: `duplicate` (copies own shots to new bean, originals unchanged), `migrate` (moves own shots via `beanId` update), `none` (no shots). Owner row created on new bean. Only user's own shots affected. Original bean unchanged for other members
- [x] 8.5 **Individual shot sharing** — `shots.share_slug` replaces `shot_shares`. Create, read, and delete share slug

## Phase 9: Implement — Unfollow, Duplicate & Edge Cases

TDD: make Phase 7.2 and Phase 8.4 tests pass, plus any failing tests from Phases 6–8.

- [x] 9.1 **Unfollow endpoint** — update `DELETE /api/beans/:id/shares/:shareId` to handle self-deletion: hard-delete pending; set `status = 'unfollowed'` + `unsharedAt` for accepted/self; re-parent descendants (`invitedBy` → owner)
- [x] 9.2 **Duplicate bean — three shot options** — update `POST /api/beans/:id/duplicate` schema from `includeShots: boolean` to `shotOption: 'duplicate' | 'migrate' | 'none'`. `duplicate` = insert copies of user's shots with new `beanId`. `migrate` = update `beanId` on existing shots (current behavior). `none` = skip
- [x] 9.3 **Edge case fixes** — re-invite clears `unsharedAt` (sets `accepted`); pending + follow = auto-accept (no duplicate row); max shares limit counts direct invites only; general access downgrade unshares `self` members for both `public` and `anyone_with_link` → `restricted`

## Phase 10: Frontend — Components, Hooks & Tests

- [x] 10.1 **Unfollow UI** — unfollow button for non-owner members on bean detail page, confirmation dialog
- [x] 10.2 **Duplicate bean UI** — duplicate button (especially for unshared/unfollowed users), shot option picker (duplicate/migrate/none, default = duplicate), redirect to new bean
- [x] 10.3 **Unfollowed/unshared state** — show status notice, read-only own shots, hide shared shots, show duplicate CTA
- [x] 10.4 **Frontend tests** — component tests for new UI states and interactions
- [x] 10.5 **"Anyone with the link" edge case** — when `general_access` is `anyone_with_link`: mute trash (remove) icon for owner and show alert on click (e.g. explain that to remove people they must change general access to restricted); no explicit reshare control needed when anyone with link can already share the link

# Additional Tasks

- [x] Log another on the shot log form should reset the form using the current shot as the "previous" via URL `/log?previousShotId={id}`
- [x] **Shot history options clarification** — Ensure UI shows all three "Share my shot history" options (Restricted, Anyone with the link, Public). Implement so that **Restricted** = only people who have access (other bean members) see my shots; **Anyone with the link** = any authenticated user with the link (not only other members); **Public** = visible on public page including unauthenticated. Align `.contextual/context/bean-sharing.md` Flow 8 table with these definitions if implementation currently differs.
