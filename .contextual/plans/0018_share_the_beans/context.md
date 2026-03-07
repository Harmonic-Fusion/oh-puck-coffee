# Problem Statement

Users currently can only share individual shots via short-link (`shot_shares` table). There is no way to share an entire bean — its metadata, shot history, or ongoing updates — with other users or publicly. This feature introduces a Google Docs-style sharing system for beans, allowing users to share bean data and shot logs with specific users, anyone with a link, or publicly.

# Scope

## Requirements

### Sharing Model (Google Docs-style)

Two layers of access control per bean, exactly like Google Docs:

1. **Individual shares** — share with specific people by selecting users. Each individual share has its own settings:
   - `share_shot_history` — whether the recipient can see the sharer's non-hidden shots for this bean
   - `reshare_enabled` — whether the recipient can create their own shares of this bean

2. **General access** — a single per-bean setting (like Google Docs' "General access" dropdown):
   - **Restricted** (default) — only people explicitly added via individual shares can see the bean
   - **Anyone with the link** — any authenticated user with the share link can view the bean
   - **Public** — anyone, including unauthenticated users, can view the bean via the share link

## Data Model

### Relationship Overview

```
users ──< accounts          (auth providers, PK: provider+providerAccountId)
users ──< sessions          (legacy JWT, kept to avoid DROP TABLE migration)
users ──< beans             (created_by FK, cascade delete)
users ──< user_beans        (user_id FK, cascade delete)
users ──< beans_share       (user_id FK cascade delete; invited_by FK set null on delete)
users ──< shots             (user_id FK, cascade delete)
users ──< shot_shares       (user_id FK, cascade delete)
users ──< integrations      (user_id FK unique, cascade delete)
users ──< feedback          (user_id FK, cascade delete)
users ──< subscriptions     (user_id FK unique, cascade delete)
users ──< user_entitlements (user_id FK, cascade delete)

beans ──< user_beans    (bean_id FK, cascade delete)
beans ──< beans_share   (bean_id FK, cascade delete)
beans ──< shots         (bean_id FK, cascade delete)
beans >── origins       (origin_id FK, nullable, no cascade)
beans >── roasters      (roaster_id FK, nullable, no cascade)

shots >── grinders  (grinder_id FK, nullable, no cascade)
shots >── machines  (machine_id FK, nullable, no cascade)
shots ──< shot_shares (shot_id FK, cascade delete)
```

---

### `users`

* `id` (uuid, PK not null default gen_random_uuid())
* `name` (text, nullable)
* `email` (text, nullable, unique)
* `email_verified` (timestamp, nullable)
* `image` (text, nullable)
* `role` (text, not null default `'member'`) `member` | `admin` | `super-admin`
* `is_custom_name` (boolean, not null default false)
* `stripe_customer_id` (text, nullable, unique)

---

### `beans`

Canonical bean record. Metadata is shared across all members.

* `id` (uuid, PK not null default gen_random_uuid())
* `name` (text, not null)
* `origin` (text, nullable) legacy free-text; prefer `origin_id`
* `roaster` (text, nullable) legacy free-text; prefer `roaster_id`
* `origin_id` (integer, nullable, FK → origins)
* `roaster_id` (integer, nullable, FK → roasters)
* `origin_details` (text, nullable) e.g. farm, region, altitude
* `processing_method` (text, nullable) e.g. washed, natural
* `roast_level` (text, not null)
* `roast_date` (timestamp, nullable)
* `is_roast_date_best_guess` (boolean, not null default false)
* `created_by` (uuid, not null, FK → users cascade delete) original creator
* `general_access` (text, not null default `'restricted'`) `restricted` | `anyone_with_link` | `public`
* `general_access_share_shots` (boolean, not null default false) whether link/public viewers see shot log
* `share_slug` (text, nullable, unique) short UID for share URL
* `created_at` (timestamp, not null default now())

---

### `user_beans`

Per-user bean collection entry. PK: `(bean_id, user_id)`.

* `bean_id` (uuid, not null, FK → beans cascade delete)
* `user_id` (uuid, not null, FK → users cascade delete)
* `open_bag_date` (timestamp, nullable) user's own bag-open date
* `created_at` (timestamp, not null default now())

---

### `beans_share`

Unified membership table. Every participant — including the owner — has exactly one row per bean. UNIQUE: `(bean_id, user_id)`.

* `id` (uuid, PK not null default gen_random_uuid())
* `bean_id` (uuid, not null, FK → beans cascade delete)
* `user_id` (uuid, not null, FK → users cascade delete) the member
* `invited_by` (uuid, nullable, FK → users set null on delete) null = owner row
* `status` (text, not null default `'pending'`) `pending` | `accepted`; owner row always `accepted`
* `share_shot_history` (boolean, not null default false) member's own opt-in: when true, all accepted active members can see this member's non-hidden shots
* `reshare_enabled` (boolean, not null default false) owner-granted permission to invite others; owner row always true
* `unshared_at` (timestamp, nullable) soft-delete: set when owner removes a member; member retains read-only access to own shots but loses all sharing privileges
* `created_at` (timestamp, not null default now())

**Row semantics:**

| Scenario | `invited_by` | `status` | `reshare_enabled` | `unshared_at` |
|----------|-------------|----------|-------------------|---------------|
| Owner row | `null` | `accepted` | `true` | always `null` |
| Pending invite | `<inviter id>` | `pending` | set by inviter | `null` |
| Accepted follower | `<inviter id>` | `accepted` | set by owner | `null` |
| Removed follower | `<inviter id>` | `accepted` | `false` (no effect) | `<timestamp>` |

**Shot visibility rule:** When viewing a bean's shots, a user sees their own shots plus the shots of every accepted member (with `unshared_at = null`) who has `share_shot_history = true`.

---

### `shots`

* `id` (uuid, PK not null default gen_random_uuid())
* `user_id` (uuid, not null, FK → users cascade delete)
* `bean_id` (uuid, not null, FK → beans cascade delete)
* `grinder_id` (uuid, nullable, FK → grinders)
* `machine_id` (uuid, nullable, FK → machines)
* `dose_grams` (numeric(5,1), nullable)
* `yield_grams` (numeric(5,1), nullable)
* `grind_level` (numeric(6,2), nullable)
* `brew_temp_c` (numeric(4,1), nullable)
* `pre_infusion_duration` (numeric(5,1), nullable)
* `brew_pressure` (numeric(4,1), nullable default 9)
* `size_oz` (numeric(5,1), nullable)
* `brew_time_secs` (numeric(5,1), nullable)
* `yield_actual_grams` (numeric(5,1), nullable)
* `estimate_max_pressure` (numeric(4,1), nullable)
* `flow_control` (numeric(4,1), nullable)
* `flow_rate` (numeric(5,2), nullable) computed on write
* `shot_quality` (numeric(3,1), nullable) 1–5 in 0.5 steps
* `rating` (numeric(3,1), nullable) 1–5 in 0.5 steps
* `bitter` (numeric(3,1), nullable)
* `sour` (numeric(3,1), nullable)
* `tools_used` (jsonb, nullable) `string[]` of tool slugs
* `notes` (text, nullable)
* `flavors` (jsonb, nullable) `string[]`
* `body_texture` (jsonb, nullable) `string[]`
* `adjectives` (jsonb, nullable) `string[]`
* `is_reference_shot` (boolean, not null default false)
* `is_hidden` (boolean, not null default false) hidden shots excluded from all shared views
* `created_at` (timestamp, not null default now())
* `updated_at` (timestamp, not null default now())

---

### `shot_shares`

Individual shot share links (separate from bean sharing).

* `id` (text, PK) short random UID used in URL
* `shot_id` (uuid, not null, FK → shots cascade delete)
* `user_id` (uuid, not null, FK → users cascade delete)
* `created_at` (timestamp, not null default now())

---

### `origins` / `roasters`

Normalized lookup tables for bean metadata.

* `id` (serial, PK)
* `name` (text, not null, unique)

---

### `grinders` / `machines`

* `id` (uuid, PK not null default gen_random_uuid())
* `name` (text, not null, unique)
* `created_at` (timestamp, not null default now())

### `tools`

* `id` (uuid, PK not null default gen_random_uuid())
* `slug` (text, not null, unique)
* `name` (text, not null)
* `description` (text, nullable)
* `created_at` (timestamp, not null default now())

---

### `user_entitlements`

Feature access grants, synced from Stripe subscriptions. PK: `(user_id, lookup_key)`.

* `user_id` (uuid, not null, FK → users cascade delete)
* `lookup_key` (text, not null) e.g. `bean-share`
* `granted_at` (timestamp, not null default now())

The `bean-share` entitlement gates: creating individual shares, enabling `reshare_enabled` for followers.

---

### `subscriptions`

* `id` (uuid, PK not null default gen_random_uuid())
* `user_id` (uuid, not null, unique, FK → users cascade delete)
* `stripe_subscription_id` (text, nullable, unique)
* `stripe_product_id` (text, nullable)
* `stripe_price_id` (text, nullable)
* `status` (text, not null) `active` | `canceled` | `past_due` | `trialing` | `incomplete`
* `current_period_start` (timestamp, nullable)
* `current_period_end` (timestamp, nullable)
* `cancel_at_period_end` (boolean, not null default false)
* `created_at` (timestamp, not null default now())
* `updated_at` (timestamp, not null default now())

### Feature Entitlement

- `bean-share` entitlement gates the ability to share beans with others and enable resharing
- Users can always view beans shared with them; entitlement is only required for the sharer
- Max bean shares per user enforced server-side (configurable via `config.maxBeanShares`)

### UI

- **Share button** on the bean detail page (`/beans/:id`) opens a Google Docs-style share dialog
- Dialog renders all members from `beans_share` uniformly; owner identified by "Owner" badge (`invitedBy = null`)
- **General access** section: dropdown (Restricted / Anyone with link / Public) + shot history toggle
- **Copy link** button for non-restricted general access
- **"Include shots" checkbox + Duplicate button**: shown instead of Share/Edit when the current user's `unshared_at` is non-null. Duplicate creates a new owned bean; with "Include shots" checked, the user's shots are reassigned to the new bean
- Share page for beans at `/share/beans/:slug` (public route, no auth required for public beans)


## Design Decisions

### Clean Break on Types (No Backward Compatibility)

`openBagDate` is fully removed from the `Bean` type. API responses return a nested `userBean` sub-object:

```
GET /api/beans → [{ id, name, createdBy, roastDate, ..., userBean: { openBagDate, createdAt } }]
GET /api/beans/:id → { id, name, createdBy, ..., userBean: { openBagDate, createdAt } }
```

All frontend code updates to `bean.userBean?.openBagDate`. No shims, no aliases.

### Zod Schema Changes

- `beanSchema`: remove `userId` → add `createdBy`, remove `openBagDate`, add `generalAccess`, `generalAccessShareShots`, `shareSlug`
- New `userBeanSchema`: `{ beanId, userId, openBagDate, createdAt }`
- `createBeanSchema`: keeps `openBagDate` as a **convenience field** for creation — the server routes it to `user_beans`, not `beans`
- New `BeanWithUserData = Bean & { userBean: UserBean | null }` for API response typing

### Bean Creation Flow

`POST /api/beans` accepts `openBagDate` in request body for convenience. The handler:
1. Inserts into `beans` with `createdBy: session.user.id` (omitting `openBagDate`)
2. Inserts into `user_beans` with the user's `openBagDate`

### Bean Editing

`PATCH /api/beans/:id`:
- Canonical fields (name, roaster, origin, etc.) → update `beans` table. Only creator or admin can edit.
- `openBagDate` → update `user_beans` table. Any user with a `user_beans` row can update their own.

### Access Control

Replace `validateMemberAccess(userId, bean.userId, role)` calls on bean routes with a new `canAccessBean(userId, beanId, role)` function that checks (in order):
1. User is admin/super-admin → allow
2. User is the creator (`beans.createdBy`) → allow
3. User has a `user_beans` row for this bean → allow
4. User has a `beans_share` row as receiver → allow (and auto-create `user_beans` row)
5. Bean has `general_access = 'anyone_with_link'` and user is authenticated → allow
6. Bean has `general_access = 'public'` → allow (even unauthenticated)
7. Otherwise → deny

### Bean List Queries

Currently: `WHERE beans.userId = session.user.id`
After: `JOIN user_beans ON beans.id = user_beans.bean_id WHERE user_beans.user_id = session.user.id`

This means a user's bean list shows all beans they have a `user_beans` row for (created + shared-with-them).

### `user_beans` Row Lifecycle

Created when:
1. User creates a new bean → auto-created for creator
2. Individual share created → auto-created for receiver (with null `openBagDate`)
3. User visits general access link and clicks "Add to collection" → created on demand

### User Search for Share Dialog

Extend `GET /api/users` with `?search=term` param. When `search` is provided, return `{id, name, image}` for all users matching by name or email (regardless of role). Limit to 10 results.

### Shared Shot Visibility

When User B views a shared bean from User A:
- Bean detail page (`/beans/:id`): Shows User B's own shots (if any) + User A's non-hidden shots (if `share_shot_history = true`)
- Public share page (`/share/beans/:slug`): Shows creator's non-hidden shots (if `general_access_share_shots = true`)

## Boundaries

- Does **not** replace the existing `shot_shares` system (individual shot sharing continues to work independently)
- Must respect the `isHidden` flag on shots — hidden shots are never included in shared shot logs
- Admin/super-admin visibility rules remain unchanged
- The `beans.roast_date` stays on the `beans` table (shared across all users); only `open_bag_date` is per-user
- Bean deletion cascades to `user_beans`, `beans_share`, and shots (existing cascade behavior unchanged)

## Dependencies

- Existing `beans` table and API (`/api/beans`)
- Existing `users` table and `/api/users` (for receiver search/select)
- Existing `user_entitlements` / Stripe entitlements system (for `bean-share` entitlement)
- Existing `shots` table (for shot log sharing, respecting `isHidden`)
- Existing share infrastructure (`short-uid` generator, `/share` routes)

## Impact Analysis

### Files requiring `beans.userId` → `beans.createdBy` updates (13 files)

| File | References |
|------|-----------|
| `src/db/schema.ts` | Schema definition |
| `src/app/api/beans/route.ts` | Filter, select, groupBy, insert (~10 refs) |
| `src/app/api/beans/[id]/route.ts` | `validateMemberAccess` calls (2 refs) |
| `src/app/api/beans/search/route.ts` | Filter (1 ref) |
| `src/app/api/beans/compare/route.ts` | Filter (1 ref) |
| `src/app/api/stats/by-bean/[beanId]/route.ts` | `validateMemberAccess` (1 ref) |
| `src/app/api/admin/beans/route.ts` | Select + join (2 refs) |
| `src/app/api/admin/beans/[id]/route.ts` | Select + join (2 refs) |
| `src/app/pucking-admin/beans/page.tsx` | `AdminBean` type (1 ref) |
| `src/app/pucking-admin/beans/[id]/page.tsx` | `BeanDetail` type + display (3 refs) |
| `src/shared/beans/schema.ts` | `beanSchema` Zod type |
| `src/components/beans/hooks.ts` | `Bean` type import (indirect via schema) |

### Files requiring `openBagDate` removal / `userBean` adoption (10 files)

| File | Change |
|------|--------|
| `src/db/schema.ts` | Remove column from `beans` |
| `src/shared/beans/schema.ts` | Remove from `beanSchema`, add `userBeanSchema` + `BeanWithUserData` type |
| `src/app/api/beans/route.ts` | Remove from select/groupBy, join `userBeans`, nest in response |
| `src/app/api/beans/compare/route.ts` | `bean.openBagDate` → join `userBeans` |
| `src/app/api/admin/beans/[id]/route.ts` | Remove from select |
| `src/components/beans/BeanSelector.tsx` | `selectedBean.openBagDate` → `selectedBean.userBean?.openBagDate` (~10 refs) |
| `src/components/shots/form/__components__/BeanSection.tsx` | Same pattern (~10 refs) |
| `src/app/(app)/beans/[id]/page.tsx` | Edit state + display → `bean.userBean?.openBagDate` (4 refs) |
| `src/app/(app)/beans/compare/page.tsx` | `BEAN_FIELDS` config + `flattenBean` → `b.userBean?.openBagDate` (2 refs) |
| `src/app/pucking-admin/beans/[id]/page.tsx` | Display (1 ref) — admin can show creator's `openBagDate` or omit |

# Solution

The solution adapts the Google Docs sharing model to beans:

1. **Two-layer access control** — individual shares (specific people with per-person settings) plus a general access level (restricted/link/public) on the bean itself. This matches the mental model users already know from Google Docs.

2. **Bean ownership restructuring** — `beans.user_id` becomes `created_by`, and a new `user_beans` junction table stores per-user data (`open_bag_date`). This enables multiple users to "have" the same bean with their own bag-specific metadata, while the canonical bean info (name, origin, roast date, etc.) stays shared. API responses nest user-specific data under `userBean` — clean break, no backward compat shims.

3. **Entitlement-gated shot sharing** — the `bean-share` entitlement (via existing Stripe entitlement system) controls whether a user can toggle `share_shot_history` on. Bean discovery and viewing are always free. This creates a clear upgrade path without locking users out of the social features.

4. **Share slug for public access** — when general access is set to `anyone_with_link` or `public`, a `share_slug` is generated (using the existing `short-uid` pattern). The public share page at `/share/beans/:slug` renders a read-only bean view with optional shot log.

# Tasks

## Phase 1: Schema, Migration & Entitlement

> No external dependencies. Foundation for all other phases.

- [x] **1.1** Update `src/db/schema.ts`: rename `beans.userId` → `beans.createdBy`, remove `openBagDate` from beans, add `generalAccess` (text, default `'restricted'`), `generalAccessShareShots` (boolean, default false), `shareSlug` (text, nullable, unique)
- [x] **1.2** Create `userBeans` table in `src/db/schema.ts`: composite PK `(beanId, userId)`, `openBagDate` (timestamp, nullable), `createdAt`. FK cascades on both `beanId` and `userId`
- [x] **1.3** Create `beansShare` table in `src/db/schema.ts`: uuid PK, `beanId`, `sharerUserId`, `receiverUserId`, `shareShotHistory` (boolean), `reshareEnabled` (boolean), `createdAt`. Unique constraint on `(beanId, sharerUserId, receiverUserId)`. FK cascades on all three FKs
- [x] **1.4** Add `BEAN_SHARE: "bean-share"` to `Entitlements` in `src/shared/entitlements.ts`
- [x] **1.5** Add `maxBeanShares` config to `src/shared/config.ts` (env var `MAX_BEAN_SHARES`, default `10`)
- [x] **1.6** Run `pnpm db:generate`, edit SQL for idempotent guards + data migration: `INSERT INTO user_beans (bean_id, user_id, open_bag_date, created_at) SELECT id, user_id, open_bag_date, created_at FROM beans`; then rename column `user_id` → `created_by`; then drop `open_bag_date`
- [x] **1.7** Run `pnpm db:migrate` and verify

**Internal dependency order:** 1.1–1.5 can be done together (all code changes) → 1.6 → 1.7

## Phase 2: Refactor Existing Code for New Schema

> **Depends on:** Phase 1 complete (schema migrated, tables exist)

- [x] **2.1** Update `src/shared/beans/schema.ts`: rename `userId` → `createdBy` in `beanSchema`, remove `openBagDate` from `beanSchema`, add `generalAccess`/`generalAccessShareShots`/`shareSlug` fields. Create new `userBeanSchema` and `BeanWithUserData` type. Keep `openBagDate` in `createBeanSchema` as creation convenience
  - ⛓️ **Must be first** — all other Phase 2 tasks import these types
- [x] **2.2** Create `canAccessBean()` helper in `src/lib/api-auth.ts`: implements access check chain (admin → creator → user_beans → beans_share → general_access → deny). Returns `{ allowed: boolean, bean, userBean? }`
  - ⛓️ **Must be before 2.4, 2.5, 2.6** — routes depend on this helper
- [x] **2.3** Update `src/app/api/beans/route.ts` (GET all variants): replace `beans.userId` → `beans.createdBy` in selects/groupBy. Replace `eq(beans.userId, session.user.id)` filter with inner join on `userBeans`. Remove `openBagDate` from bean selects, add `openBagDate: userBeans.openBagDate` + `userBeanCreatedAt: userBeans.createdAt`. Nest into `userBean` sub-object in response
  - ⛓️ Depends on **2.1**
- [x] **2.4** Update `src/app/api/beans/route.ts` (POST): insert into `beans` with `createdBy` (omit `openBagDate`), then insert into `userBeans` with user's `openBagDate`. Return response with nested `userBean`
  - ⛓️ Depends on **2.1**
- [x] **2.5** Update `src/app/api/beans/[id]/route.ts` (GET + PATCH): replace `validateMemberAccess` with `canAccessBean()`. GET joins `userBeans` for current user, returns nested `userBean`. PATCH splits: canonical fields → `beans` (creator/admin only), `openBagDate` → `user_beans` (any user with row)
  - ⛓️ Depends on **2.1**, **2.2**
- [x] **2.6** Update `src/app/api/beans/search/route.ts` + `src/app/api/beans/compare/route.ts`: replace `beans.userId` filter with `userBeans` join. Compare returns `userBean` nested
  - ⛓️ Depends on **2.1**, **2.2**
- [x] **2.7** Update `src/app/api/stats/by-bean/[beanId]/route.ts`: replace `validateMemberAccess` with `canAccessBean`
  - ⛓️ Depends on **2.2**
- [x] **2.8** Update admin routes (`src/app/api/admin/beans/route.ts`, `[id]/route.ts`): `beans.userId` → `beans.createdBy` in selects/joins. Admin detail may omit `userBean` or show creator's
  - ⛓️ Depends on **2.1** only (admin bypasses `canAccessBean`)
- [x] **2.9** Update admin UI (`src/app/pucking-admin/beans/page.tsx`, `[id]/page.tsx`): `userId` → `createdBy` in types + display
  - ⛓️ Depends on **2.8**
- [x] **2.10** Update frontend components to use `bean.userBean?.openBagDate`:
  - `src/components/beans/BeanSelector.tsx` — edit form reads from `userBean`
  - `src/components/shots/form/__components__/BeanSection.tsx` — same
  - `src/app/(app)/beans/[id]/page.tsx` — edit state + display
  - `src/app/(app)/beans/compare/page.tsx` — `BEAN_FIELDS` config + `flattenBean`
  - `src/components/beans/hooks.ts` — update `Bean` → `BeanWithUserData` in hook return types
  - ⛓️ Depends on **2.1** (types), **2.3–2.6** (API shape changes)

## Phase 3: Sharing API & User Search

> **Depends on:** Phase 1 (new tables), Phase 2 tasks 2.1 (schemas) + 2.2 (`canAccessBean`)
> Phase 2 tasks 2.3–2.10 can run in parallel with Phase 3 if 2.1 + 2.2 are done.

- [x] **3.1** Add routes to `src/app/routes.ts`: `POST /api/beans/:id/shares`, `GET /api/beans/:id/shares`, `DELETE /api/beans/:id/shares/:shareId`, `PATCH /api/beans/:id/general-access`, `GET /api/shares/beans/:slug`
  - ⛓️ **Must be first** in Phase 3
- [x] **3.2** Implement `POST /api/beans/:id/shares`: validate creator OR reshare permission via `canAccessBean`, check `bean-share` entitlement if `shareShotHistory=true`, enforce `maxBeanShares` limit, insert `beansShare` row, auto-create `userBeans` row for receiver
  - ⛓️ Depends on **3.1**, **2.2**
- [x] **3.3** Implement `GET /api/beans/:id/shares`: return individual shares list + general access settings. Only bean creator (or admin) can view
  - ⛓️ Depends on **3.1**
- [x] **3.4** Implement `DELETE /api/beans/:id/shares/:shareId`: revoke share, optionally remove receiver's `userBeans` row (only if they have no shots against this bean)
  - ⛓️ Depends on **3.1**
- [x] **3.5** Implement `PATCH /api/beans/:id/general-access`: update `generalAccess`, `generalAccessShareShots` on bean. Generate `shareSlug` via `generateShortUid()` when non-restricted; clear when restricted. Creator-only
  - ⛓️ Depends on **3.1**
- [x] **3.6** Implement `GET /api/shares/beans/:slug` (public, no auth): look up bean by `shareSlug`, check `generalAccess`, return bean metadata + conditionally shot log (non-hidden shots from creator if `generalAccessShareShots=true`)
  - ⛓️ Depends on **3.1**
- [x] **3.7** Extend `GET /api/users` with `?search=term`: return `{id, name, image}` for all users matching by name/email, limit 10. Required for share dialog user picker
  - ⛓️ **Independent** — no deps on other Phase 3 tasks, can be done first or in parallel

## Phase 4: Share Dialog UI & Public Page

> **Depends on:** Phase 3 (API endpoints), Phase 2.10 (frontend already updated for new types)

- [x] **4.1** Add share hooks in `src/components/beans/hooks.ts`: `useBeanShares(beanId)`, `useCreateBeanShare()`, `useDeleteBeanShare()`, `useUpdateGeneralAccess()`, `useUserSearch(query)`
  - ⛓️ Depends on **3.1** (route defs)
- [x] **4.2** Create `ShareBeanDialog` component in `src/components/beans/ShareBeanDialog.tsx`: Google Docs-style modal with "Add people" section (user search via 3.7, per-person toggles) and "General access" section (dropdown + shot history toggle). Copy-link button when general access is not restricted. Current shares list with remove buttons
  - ⛓️ Depends on **4.1**
- [x] **4.3** Wire share button on bean detail page (`src/app/(app)/beans/[id]/page.tsx`) to open `ShareBeanDialog` instead of clipboard copy. Entitlement UI: disable `share_shot_history` toggle with upgrade prompt when user lacks `bean-share` entitlement. Show limit-reached message when `maxBeanShares` exceeded
  - ⛓️ Depends on **4.2**, **1.4** (entitlement key)
- [x] **4.4** Add public app route `share.beans` with `_is_public: true` to `AppRoutes`. Create page at `src/app/share/beans/[slug]/page.tsx` (server component, follows existing `share/[uid]/page.tsx` pattern): fetch bean via API 3.6, render read-only bean metadata + conditional shot log. Handle not-found and access-denied states
  - ⛓️ Depends on **3.6** (public API)

## Phase 5: Enrich Public Share Page — Stats, Auth CTA, Follow & Share-Shot Choice

> **Depends on:** Phase 4 (public share page and share API). Enriches `/share/beans/[slug]` with public stats, login prompt for guests, and for logged-in non-owners: follow + opt-in to share shot history.

- [x] **5.1** Add public stats endpoint: `GET /api/stats/beans/[beanId]` (or `GET /api/shares/beans/:slug/stats`) that returns **200** with public-only data when the bean is accessible (general access is link or public). Response: `{ shotCount, followerCount, averageRating, flavorsByAverageRating }`. `shotCount` = count of non-hidden shots visible for this bean (creator’s when `generalAccessShareShots`; same visibility as 3.6). `followerCount` = count of `user_beans` rows for this bean. `averageRating` = mean of `shots.rating` over those shots (null if none). `flavorsByAverageRating` = list of `{ flavor, averageRating, shotCount }` for each flavor present in those shots, sorted by `averageRating` descending (flavors from `shots.flavors`; per-flavor average of shot rating). No auth required when bean is public; when general access is "anyone_with_link", caller may pass slug in URL so backend can resolve bean and allow unauthenticated read. Add route to `src/app/routes.ts` and implement in `src/app/api/stats/beans/[beanId]/route.ts` or under `api/shares/beans/[slug]/stats`.
  - ⛓️ **Must be first** in Phase 5 — page consumes this for stats section.

- [x] **5.2** Share page (`src/app/share/beans/[slug]/page.tsx`): if user is **not** logged in, show a clear CTA to log in or register (e.g. banner or card with links to `AppRoutes.login.path`). Stats and shot log remain visible for public beans; CTA encourages sign-up to follow or add to collection.
  - ⛓️ Depends on **4.4** (share page exists).

- [x] **5.3** Share page: if user **is** logged in and is **not** the bean creator/sharer (i.e. they are a visitor), show: (1) **Follow** — action to add bean to their collection (calls existing `POST /api/beans/:id/add-to-collection` or equivalent so they get a `user_beans` row); (2) **Share my shot history** — optional toggle/checkbox so they can choose whether their own shots for this bean are included in shared/public stats and shot log (requires backend support: e.g. per-user setting on `user_beans` like `share_my_shots_publicly` or equivalent, and 3.6 / 5.1 to include those shots when computing public shot list and stats). Implement follow button + opt-in control and any new API/DB field needed for “share my shots for this bean.”
  - ⛓️ Depends on **5.1** (stats), **4.4**; may require new column or policy for “share my shot history” and updates to 3.6 and 5.1 to include opted-in users’ shots.

- [x] **5.4** Share page: if user is logged in and **is** the bean creator (or has reshare and is the sharer), show a link/button to the bean detail page (`AppRoutes.beans.beanId`) to "Manage sharing" so they can open the share dialog from the app. No duplicate share UI on the public page.
  - ⛓️ Depends on **4.4**.

## Additional Tasks

- [x] No shots yet. Log your first espresso shot to see it here. Add a button to add a shot
- [x] When user A shares a bean with User B, User B must accept the share before gaining access. Implemented: `beans_share.status` (`pending` | `accepted`), POST create share as pending (no auto user_beans), canAccessBean only allows via share when accepted, POST `/api/beans/:id/shares/:shareId/accept` for receiver to accept, GET `/api/shares/invites` for pending invites, receiver may DELETE pending share (decline). UI: BeanShareInvitesBanner on beans page with Accept/Decline; ShareBeanDialog shows Pending/Accepted badge.
- [x] If there are pending bean invites, show a small badge on the "Beans" nav item (Sidebar and NavBar) with the number of invites.
- [x] Shots form sections: hide "Edit Inputs" in collapsed state; Setup with no inputs shows "Expand to Edit" when collapsed; sections with required steps (Recipe, Tasting) start expanded.
- [x] Create unit tests for beans sharing: Zod schemas (`createBeanShareSchema`, `updateGeneralAccessSchema`, `updateBeanShareSchema`) in `src/shared/beans/__tests__/schema.test.ts`; `hasEntitlement` and `Entitlements` in `src/shared/__tests__/entitlements.test.ts`; `canAccessBean` (with mocked db) in `src/lib/__tests__/api-auth.test.ts`.
- [x] Create unit tests for `GET /api/beans/:id/shots` shot history visibility: Alice=owner does not share → Bob cannot see Alice history; Alice shares with Bob (accepted, `shareShotHistory=false`) → Bob still cannot see Alice history; Alice updates to `shareShotHistory=true` → Bob can now see Alice history (non-hidden only); Alice queries → cannot see Bob's history (no reverse share); Bob creates reverse share with `shareShotHistory=true` → Alice can now see Bob's history. 17 tests in `src/app/api/beans/[id]/shots/__tests__/shot-history-visibility.test.ts`.
- [x] Create QA testing plan for beans sharing: `.contextual/plans/0018_share_the_beans/qa-testing-plan.md` covering general access variants, individual shares (add/accept/decline, shot history, reshare), entitlement and max shares, public share page, nav badge, API validation, and regression.
- [x] Playwright E2E tests: isolated test DB (`coffee_test`), guardrails, test users (Alice/Bob/Carol), fixtures (`e2e/fixtures/` with db + pages), beans-sharing spec; `pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
- [x] on the `/beans/(id)` page Create helper componets to clean up the organization ( `.contextual/context/guidelines.md` ). Next to the "Share" button add a "SharedWith" component. Choose the top 3 users images, make those circles overlapping, the top circle should be a filled one with the following logic * If public, then add an "inf" icon on top. * If restricted then put the number of shared users on that.

## Dependency Graph Summary

```
Phase 1 (schema + migration)
  │
  ├──→ 2.1 (Zod schemas) ──→ 2.3, 2.4, 2.6, 2.8, 2.10
  │
  ├──→ 2.2 (canAccessBean) ──→ 2.5, 2.6, 2.7, 3.2
  │
  ├──→ 1.4 (entitlement) ──→ 4.3
  │
  └──→ 1.5 (config) ──→ 3.2
       
Phase 2 (refactor)               Phase 3 (sharing API)
  2.1 + 2.2 ──────────────────→ 3.1 (routes) ──→ 3.2–3.6, 4.1
  2.8 ──→ 2.9                   3.7 (user search, independent)
  2.3–2.6 ──→ 2.10
                                 Phase 4 (UI)
                                   4.1 ──→ 4.2 ──→ 4.3
                                   3.6 ──→ 4.4 ──→ Phase 5 (enrich share page)
                                                    5.1 (public stats) ──→ 5.2 (guest CTA), 5.3 (follow + share shots), 5.4 (owner link)
```

**Critical path:** Phase 1 → 2.1 + 2.2 → 2.3–2.6 → 2.10 + 3.1 → 3.2–3.6 → 4.1–4.3
**Parallelizable:** 3.7 (user search) at any time after Phase 1. 2.8–2.9 (admin) at any time after 2.1. 4.4 (public page) at any time after 3.6. Phase 5 (5.1 → 5.2, 5.3, 5.4) after 4.4; 5.3 may require schema/API changes for "share my shot history."
