# Problem Statement

The app has a working user-facing feedback submission flow but no admin surface to triage that data. The `feedback` table lacks `status` and `priority` fields, making it impossible to track which items are being acted on. Admins need a dedicated `/pucking-admin/feedback` page with a filterable, sortable list view and inline bulk-editing of status and priority.

# Scope

### Requirements

- New page at `/pucking-admin/feedback` protected by existing `super-admin` guard.
- Table displays all feedback rows joined with the submitting user's email, with columns: type, user (email), subject, status, priority, created at.
- Filter controls for: feedback type (`bug | feature | other`), status, and date-range for `created_at`. Filters are reflected in the URL query-string so they survive refresh.
- Multi-select rows with a bulk-action bar: set status and/or priority on all selected rows in one request.
- Inline per-row edit via a modal form to update `status` and `priority` with a message preview.
- New `status` field on `feedback` table: `new | reviewed | in_progress | complete | wont_implement`, default `new`.
- New `priority` field on `feedback` table: integer 0–100, nullable, default null.

### Boundaries (out of scope)

- No public-user-visible status display.
- No email notifications on status change.
- No deletion from this UI.
- No changes to the existing `POST /api/feedback` submission route.

### Dependencies

- Drizzle schema + migration adding two columns to `feedback` table.
- New API routes: `GET /api/admin/feedback`, `PATCH /api/admin/feedback/[id]`, `PATCH /api/admin/feedback/bulk`.
- Existing components: `GenericDataTable`, `AdminBreadcrumb`, `Modal`, `Button`.
- Existing patterns: `requireSuperAdmin()`, `useAdminData` hook.
- `AppRoutes` and `ApiRoutes` in `src/app/routes.ts` need new entries.

# Solution

Follow the established admin list-page pattern (same as Users and Tools pages):

1. A `"use client"` page component rendering `GenericDataTable` with custom column definitions plus an overlay form for editing.
2. A `GET /api/admin/feedback` route accepting `limit`, `offset`, `search`, `type`, `status`, `dateFrom`, `dateTo` — joins `feedback` with `users`.
3. A `PATCH /api/admin/feedback/[id]` route for single-item edits.
4. A `PATCH /api/admin/feedback/bulk` route accepting `{ ids: string[], status?, priority? }` for bulk updates.

Filter state managed with `useSearchParams` / `useRouter` so filters survive navigation. Extend `useAdminData` (or inline a local fetch) to forward arbitrary extra query params. Multi-select state lives in the page component with a checkbox column injected as the first `ColumnDef`.

# Tasks

## Phase 1: Database Schema + Migration

- [x] Add `status` column to `feedback` table in `src/db/schema.ts` — type `text`, enum values `new|reviewed|in_progress|complete|wont_implement`, default `"new"`, not null
- [x] Add `priority` column to `feedback` table in `src/db/schema.ts` — type `integer`, nullable (0–100)
- [x] Run `pnpm db:generate` to produce migration SQL, then `pnpm db:migrate` (or `pnpm db:push`) to apply

## Phase 2: API Routes

- [x] Add route entries to `src/app/routes.ts`: `AppRoutes.puckingAdmin.feedback` and `ApiRoutes.admin.feedback` (with `.feedbackId` and `.bulk` sub-entries)
- [x] Create `src/app/api/admin/feedback/route.ts` — `GET` handler guarded by `requireSuperAdmin()`, joins `feedback` + `users`, applies `type`/`status`/`dateFrom`/`dateTo` filters via Drizzle `and(...)`, returns `{ data, total, limit, offset }`
- [x] Create `src/app/api/admin/feedback/[id]/route.ts` — `PATCH` handler with Zod validation for `{ status?, priority? }`, updates row, returns updated row or 404
- [x] Create `src/app/api/admin/feedback/bulk/route.ts` — `PATCH` handler accepting `{ ids: string[], status?, priority? }`, validates non-empty ids array and at least one of status/priority, bulk-updates with `inArray`, returns `{ updated: number }`

## Phase 3: Admin Page UI

- [x] Extend `useAdminData` in `src/components/admin/hooks.ts` to accept optional `extraParams?: Record<string, string>` and merge them into the fetch URL
- [x] Create `src/app/pucking-admin/feedback/page.tsx` as `"use client"`:
  - Read URL search params to initialize filter state (`type`, `status`, `dateFrom`, `dateTo`)
  - Push filter changes to URL via `useRouter()`, reset pagination on filter change
  - Render filter toolbar as `toolbar` prop of `GenericDataTable`: Type `<select>`, Status `<select>`, two `<input type="date">` fields, Reset button
  - Inject checkbox column as first `ColumnDef`; manage `selectedIds: Set<string>` state
  - Render bulk-action bar (visible when `selectedIds.size > 0`): status dropdown + priority number input + "Apply to N selected" button → calls `/api/admin/feedback/bulk`
  - Render colored `status` badge (new=blue, reviewed=purple, in_progress=amber, complete=green, wont_implement=muted)
  - Render `priority` as number or `—` when null
  - Wire `rowActions` to an "Edit" button that sets `editTarget` state to open `FeedbackEditForm`

## Phase 4: FeedbackEditForm Component

- [x] Create `src/components/admin/forms/FeedbackEditForm.tsx` as `"use client"`:
  - Props: `open: boolean`, `onClose: () => void`, `feedback: AdminFeedback`
  - Display read-only: user email, type badge, subject, full message (scrollable)
  - Editable: `status` `<select>` (5 options) + `priority` `<input type="number" min=0 max=100>` with a "Clear" button to null it
  - Submit: `PATCH /api/admin/feedback/:id`; on success invalidate query and call `onClose()`
  - Inline error display; uses `Modal` + `Button` from `@/components/common`

## Phase 5: Navigation Wiring

- [x] Add `"Feedback"` link to `adminNavLinks` in `src/app/pucking-admin/layout.tsx`
- [x] Add feedback card to overview grid in `src/app/pucking-admin/page.tsx`

## Phase 6: Validation

- [ ] Page loads for super-admin and shows existing feedback rows
- [ ] All three filter types (type, status, date range) correctly narrow results and persist in URL
- [ ] Per-row edit saves status/priority and table refreshes without full reload
- [ ] Multi-select + bulk apply correctly updates all selected rows
- [ ] Non-super-admin receives 403 on all new API routes
