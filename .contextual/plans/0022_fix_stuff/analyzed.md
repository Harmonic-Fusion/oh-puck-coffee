# Codebase Analysis

## Key Files

### Health Check
- `src/components/common/ApiHealthErrorBoundary.tsx` — wraps app, runs health check on mount (useEffect) AND on any React ErrorBoundary catch. Shows toast on failure.
- Currently: 3 retries at 1s each, triggered on mount and on any React error.

### ShotSuccessModal
- `src/components/shots/form/__components__/ShotSuccessModal.tsx` — modal shown after submit
- Has close "x" button at top-right, uses `ActionButtonBar` for actions
- Action buttons: Shot Details, Log Another, Share
- `ShotForm.tsx` manages `hasJustLogged` state; form shows "Shot logged" + "Log another" link after submit
- Phrase lives in `src/app/(app)/log/page.tsx` — random phrase from ENCOURAGING_PHRASES array, displayed via TypewriterText; needs to be passed down to ShotForm and then ShotSuccessModal

### Shots Page
- `src/app/(app)/shots/page.tsx` — header has download button with ArrowDownTrayIcon, no "+" button
- Uses `AppRoutes.log.path` for navigation to log page

### Beans Detail Page
- `src/app/(app)/beans/[id]/page.tsx` — layout needs reorganization
- Sub-components: SharedWith, BeanInfoGrid, DuplicateBeanModal, ShotHistory
- Has share dialog, edit modal, duplicate modal, brew shot button

### Beans Page
- `src/app/(app)/beans/page.tsx` — already has filters: Roaster, Origin, Roast Level, Processing Method
- Has MobileSortBar, search, CSV export
- Shots page has more filters: bean, status, tags, quality, rating — standardization needed

### Stats Page
- `src/app/(app)/stats/page.tsx` — no filters, just fetches all data
- Has STATS_VIEW entitlement check

### Admin
- `src/app/api/admin/users/route.ts` — GET with search/pagination, returns users with subscription + entitlements; no shot/bean stats
- `src/app/pucking-admin/feedback/page.tsx` — has bulk status update, no individual delete
- `src/app/pucking-admin/billing/page.tsx` — catalog view + sync; no EntitlementFeatures list
- `src/app/pucking-admin/beans/[id]/page.tsx` — shows bean metadata + stats + creator; no sharing table

## Patterns
- React Query (`@tanstack/react-query`) for all data fetching
- React Table for sortable/filterable tables
- URL search params for admin page filters
- Multi-select dropdown pattern for filters (beans page)
- `AppRoutes` for all navigation paths
- `ActionButtonBar` used in ShotSuccessModal for action buttons
