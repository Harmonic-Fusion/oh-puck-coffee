# Problem Statement

Create a super admin interface (`/pucking-admin`) that allows users with `role="super-admin"` to view and manage all application data. The admin interface should provide generic, reusable data table components that can display any data model with pagination, and include create/edit functionality. Additionally, add dashboard metrics to the home page showing Daily Active Users (based on shots pulled) and a User Leaderboard.

# Scope

## Requirements

1. **Super Admin Role**
   - Add `"super-admin"` role to the authentication system (database schema, TypeScript types, auth callbacks)
   - Update role type from `"member" | "admin"` to `"member" | "admin" | "super-admin"`
   - Create server-side authorization helper `requireSuperAdmin()` in `src/lib/api-auth.ts`

2. **Admin Route Protection**
   - Create `/pucking-admin` route group with server-side role check
   - Only users with `role="super-admin"` can access these routes
   - All admin routes must verify role on the server side (not just client-side)
   - Use `_require_super_admin: true` flag in `src/app/routes.ts` as source of truth for route protection

3. **Admin Pages**
   - `/pucking-admin/users` - View all users
   - `/pucking-admin/beans` - View all beans
   - `/pucking-admin/shots` - View all shots
   - `/pucking-admin/equipment/tools` - View all tools
   - `/pucking-admin/equipment/machines` - View all machines
   - `/pucking-admin/equipment/grinders` - View all grinders

4. **Generic Data Table Component**
   - Create a reusable `DataTable` component that accepts:
     - A Zod schema (e.g., `beanSchema`, `shotSchema`, `userSchema`)
     - API endpoint path
     - Column configuration (which fields to display, formatting, etc.)
   - Support pagination (limit/offset query params)
   - Support sorting and filtering
   - **Search/filter functionality for all fields** - Add search/filter UI that allows filtering by any field in the schema
   - Generate table columns from schema fields automatically
   - Use shadcn table components (`src/components/ui/table.tsx`)

5. **Create/Edit Forms**
   - Generic form components for each data model
   - Use existing create schemas (e.g., `createBeanSchema`, `createShotSchema`)
   - Support both create and edit modes
   - **Use modal/dialog-based editing** (not inline editing)
   - Integrate with existing API endpoints or create admin-specific endpoints if needed

6. **Home Page Dashboard Metrics**
   - Add metrics section to the landing page (`src/app/(landing)/page.tsx`)
   - Daily Active Users: Count of unique users who pulled shots in the last 24 hours
   - User Leaderboard: Top N users by shot count (with user names/emails)
     - **Selectable limit with default of 10** - Users can choose how many to display (default: 10)

## Boundaries

- Admin pages are read-only for viewing data (create/edit is separate requirement)
- Use existing API endpoints where possible; create admin-specific endpoints only if needed for cross-user data access
- Dashboard metrics should be visible to all users (public or authenticated)
- Generic table component should be flexible enough to handle different data types (strings, numbers, dates, arrays, etc.)

## Dependencies

- Existing authentication system (`src/auth.ts`)
- Existing database schema (`src/db/schema.ts`)
- Existing shared schemas (`src/shared/*/schema.ts`)
- Existing API routes structure
- shadcn table components (`src/components/ui/table.tsx`)
- Route definitions (`src/app/routes.ts`)

# Solution

## Approach

1. **Role System Extension**
   - Extend the role enum in database schema, TypeScript types, and auth callbacks
   - Add migration to update `users.role` column to support `"super-admin"`
   - Update `requireAdmin()` helper or create `requireSuperAdmin()` helper

2. **Admin Route Structure**
   - Create route group `(admin)` or use path prefix `/pucking-admin`
   - Add `_require_super_admin: true` flag to all admin routes in `src/app/routes.ts`
   - Update `src/lib/routes-builder.ts` to support `_require_super_admin` metadata flag
   - Add middleware/route handler to check `role === "super-admin"` server-side using route metadata
   - Add routes to `src/app/routes.ts` for all admin pages

3. **Generic Data Table Architecture**
   - Create `GenericDataTable` component that:
     - Accepts a schema and API endpoint
     - Uses React Query for data fetching with pagination
     - Dynamically generates columns from schema shape
     - Supports custom column overrides for formatting
     - Handles pagination state (page, limit)
     - **Includes search/filter UI for all fields** - Add filter inputs for each schema field
   - Create wrapper components for each model (e.g., `UsersTable`, `BeansTable`) that configure the generic component

4. **API Endpoints**
   - Extend existing endpoints to support super-admin access (remove user filtering)
   - Or create admin-specific endpoints under `/api/admin/*` that bypass user filtering
   - Ensure pagination support (limit/offset) in all admin endpoints

5. **Dashboard Metrics**
   - Create new API endpoint `/api/stats/dashboard` for public metrics
   - Query shots table for Daily Active Users (last 24 hours, unique userIds)
   - Query shots table for User Leaderboard (group by userId, count shots, join users table)
     - **Support limit parameter** (default: 10, user-selectable)
   - Add metrics section to landing page

## Reasoning

- Generic table component reduces code duplication and makes it easy to add new admin pages
- Server-side role checking ensures security even if client-side checks are bypassed
- Reusing existing schemas ensures type safety and consistency
- Extending existing API endpoints (with role-based filtering removal) is simpler than creating duplicate admin endpoints

# Tasks

## Phase 1: Super Admin Role Infrastructure

- [x] Update database schema to support `"super-admin"` role (migration with idempotent guards)
- [x] Update TypeScript types in `src/types/next-auth.d.ts` to include `"super-admin"`
- [x] Update `src/shared/users/schema.ts` to include `"super-admin"` in role enum
- [x] Update auth callbacks in `src/auth.ts` to handle `"super-admin"` role
- [x] Create `requireSuperAdmin()` helper in `src/lib/api-auth.ts`
- [x] Update middleware if needed to handle super-admin routes (already implemented)

## Phase 2: Admin Route Structure

- [x] Update `src/lib/routes-builder.ts` to support `_require_super_admin` metadata flag
  - Add to `RouteMetaKeys` type
  - Update `RouteSpec` type to include `_require_super_admin?: true`
  - Update `BuiltRouteObject` type to include `_require_super_admin?: true`
  - Update `RouteEntry` interface to include `_require_super_admin?: true`
  - Update `buildRoutesRecursive` to preserve the flag
  - Update `buildRouteMap` to include the flag in route entries
- [x] Add admin routes to `src/app/routes.ts` with `_require_super_admin: true` flag
  - `/pucking-admin` (base)
  - `/pucking-admin/users`
  - `/pucking-admin/beans`
  - `/pucking-admin/shots`
  - `/pucking-admin/equipment/tools`
  - `/pucking-admin/equipment/machines`
  - `/pucking-admin/equipment/grinders`
- [x] Update middleware to check `_require_super_admin` flag and verify role server-side
- [x] Create admin layout component with navigation (`src/app/pucking-admin/layout.tsx`)
- [x] Create base admin page at `/pucking-admin` with overview/links to sub-pages (`src/app/pucking-admin/page.tsx`)
- [x] Add server-side role check to admin route handlers (using `requireSuperAdmin()` in layout + all `/api/admin/*` routes)

## Phase 3: Generic Data Table Component

- [x] Create `GenericDataTable` component in `src/components/admin/GenericDataTable.tsx`
  - Accept API endpoint, column config
  - Implement pagination (limit/offset)
  - **Implement search/filter** - search input with backend filtering
  - Support custom column formatters
  - Auto-formats dates, booleans, arrays, long strings
- [x] Create hooks for admin data fetching (`src/components/admin/hooks.ts`)
  - `useAdminData` hook: accepts endpoint, pagination params, and search param
  - Returns paginated data with total count

## Phase 4: Admin API Endpoints

- [x] Create dedicated `/api/admin/*` endpoints that bypass user filtering (all protected by `requireSuperAdmin()`)
  - `/api/admin/users` - all users with search support
  - `/api/admin/beans` - all beans with user email join
  - `/api/admin/shots` - all shots with user/bean/equipment joins
  - `/api/admin/equipment/grinders` - all grinders
  - `/api/admin/equipment/machines` - all machines
  - `/api/admin/equipment/tools` - all tools
- [x] All endpoints support pagination (`limit`/`offset`) and return total count

## Phase 5: Admin Pages Implementation

- [x] Create `/pucking-admin/users` page - shows all users with role badges, email search
- [x] Create `/pucking-admin/beans` page - shows all beans with user attribution, name search
- [x] Create `/pucking-admin/shots` page - shows all shots with user/bean/equipment joins
- [x] Create `/pucking-admin/equipment/tools` page - all tools with slug/description
- [x] Create `/pucking-admin/equipment/machines` page - all machines
- [x] Create `/pucking-admin/equipment/grinders` page - all grinders
- [x] Each page uses `GenericDataTable` with typed column definitions

## Phase 6: Create/Edit Forms

- [x] Create form components in `src/components/admin/forms/`:
  - `NameForm.tsx` — reusable for grinders & machines (name field only)
  - `ToolForm.tsx` — name, slug (auto-generated from name), description
  - `UserRoleForm.tsx` — radio selector for member/admin/super-admin
- [x] Add create/edit modals (dialog-based via existing `Modal` component)
- [x] Add POST handlers to `/api/admin/equipment/{grinders,machines,tools}`
- [x] Add PATCH handlers at `/api/admin/equipment/{grinders,machines,tools}/[id]` and `/api/admin/users/[id]`
- [x] Add `toolbar` (Create button) and `rowActions` (Edit button) props to `GenericDataTable`
- [x] Wire grinders, machines, tools pages with create + edit modals
- [x] Wire users page with "Edit Role" modal (role change only, no create since OAuth-only sign-up)

## Phase 7: Home Page Dashboard Metrics

- [x] Create `/api/stats/dashboard` endpoint (`src/app/api/stats/dashboard/route.ts`)
  - Daily Active Users: count distinct users with shots in last 24h
  - Leaderboard: top N users by shot count (with name/email join)
  - Accept `limit` query param (default: 10, max: 100)
- [x] Create `DashboardMetrics` client component (`src/components/landing/DashboardMetrics.tsx`)
  - Displays DAU count prominently
  - Leaderboard with selectable limit (5, 10, 25, 50) defaulting to 10
  - Loading skeleton states
- [x] Add `<DashboardMetrics />` to landing page between Features and CTA sections

## Additional Tasks

- [x] Add charts and metrics to `/pucking-admin` page — stat cards (Total Users, Daily Active Users, Total Shots) and a 14-day activity chart (shots + active users) using recharts. Created `/api/admin/stats` endpoint and `AdminMetrics` component.
