# Problem Statement

Several small UI and admin fixes needed across the app: health check behavior, shot success modal improvements, navigation shortcuts, beans detail layout, filter standardization, and admin data enhancements.

# Scope

- Health check toast shows only for actual API health failures, not React errors; delayed 5 minutes
- ShotSuccessModal: remove X, stack icons over labels, show phrase, remove "log another" post-submit state
- Add "+" nav button to shots page header
- Beans detail page header layout: two-row format
- Beans detail: "+" to log shot with prepopulated bean/last shot data
- Filter/sort UI standardized between `/beans` and `/shots` pages for mobile
- Stats page gets same filters as shots, passed to API
- Admin users endpoint returns computed stats; admin UI shows them
- Admin feedback: delete individual items
- Admin billing: show list of all EntitlementFeatures
- Admin beans detail: show sharing table

# Tasks

## Phase 1: Isolated Component Fixes

- [x] **Health check**: In `ApiHealthErrorBoundary.tsx`, remove `useEffect` mount trigger and `onError` → `runHealthCheck` connection. Add a `setInterval` that polls `/api/health` every 5 minutes; show toast only after the first confirmed failure in that poll cycle. Reset on success.
- [x] **ShotSuccessModal — remove X**: Delete the close button `<button>` from `ShotSuccessModal.tsx`.
- [x] **ShotSuccessModal — phrase**: Moved phrases to `src/lib/log-phrases.ts`. Pass `phrase` prop through `ShotForm` → `ShotSuccessModal`; display it below the header title.
- [x] **ShotSuccessModal — stacked action buttons**: Added `stackLabels` prop to `ActionButtonBar`; modal uses `stackLabels` to render icon above label (flex-col).
- [x] **ShotSuccessModal — remove log another**: Removed `hasJustLogged` state, `handleLogAnother`, and the post-submit "Shot logged / Log another" UI from `ShotForm.tsx`. Submit button always shown. Removed "Log Another" action from modal.
- [x] **Shots page "+" button**: Added `<Link href={AppRoutes.log.path}>` with `PlusCircleIcon` after the download dropdown in shots page header.

## Phase 2: Layout and Navigation

- [x] **Beans detail header layout**: Refactored `/beans/[id]/page.tsx` header into two rows: row 1 = `<h1 title>` + `<SharedWith + ShareButton>` with `justify-between`; row 2 = `<DuplicateButton> <EditButton> <BrewShotButton>` left-aligned.
- [x] **Beans detail "+" button**: Added `<Link>` "Brew Shot" with `PlusCircleIcon` in row 2. Links to `/log?previousShotId=<id>` if a prior shot exists, else `/log?beanId=<id>`.

## Phase 3: Filter Standardization

- [x] **Beans/shots filter standardization**: Added `BeanFilterBar` with roaster/origin/roast/process filters to beans page; fixed beans search focus color to amber; added `MobileSortBar` to shots page (date/bean/rating/quality/time sort pills, mobile only).
- [x] **Stats page filters**: Added date-range filter UI (From/To inputs) to stats page; passes `dateFrom`/`dateTo` to `useShots` for server-side filtering; increased shots limit to 500.

## Phase 4: Admin Enhancements

- [x] **Admin users stats**: In `api/admin/users/route.ts`, add subqueries for: shot count, bean count, first shot timestamp, last shot timestamp, avg quality, avg rating, avg brew ratio, most used bean name, top 3 flavors. Display in the admin users table as expandable detail or extra columns.
- [x] **Admin feedback delete**: Add `DELETE /api/admin/feedback/[id]` endpoint with admin auth check. Add delete button (with confirm dialog) to each row in `pucking-admin/feedback/page.tsx`.
- [x] **Admin billing entitlements**: Fetch or enumerate all `EntitlementFeature` values (from the type/enum definition); render as a simple card/list on `pucking-admin/billing/page.tsx`.
- [x] **Admin beans sharing table**: In `api/admin/beans/[id]` route, include `beans_share` records. In `pucking-admin/beans/[id]/page.tsx`, render a simple table showing shared-with user emails, access level, and timestamps.


