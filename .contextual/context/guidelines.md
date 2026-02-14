# Rules

## Code Style

**Import Statements**

✅ `import type { ComponentProps } from "react"`
❌ `import * as React from "react"`
EXCEPT: `import * as z from "zod"`

**Function Declarations**

✅ `function Component(props: ComponentProps) { ... }`
❌ `const Component = (props) => { ... }`

## Environment Variables

Put at top of files:

```ts
const CONFIG = {
  VERBOSE: process.env.VERBOSE,
  ENABLED: process.env.ENABLED,
}
```

**Prefer explicit variables over NODE_ENV**: Use specific environment variables for feature flags and configuration instead of checking `NODE_ENV`. This allows independent control of features regardless of environment.

```ts
// ✅ Explicit variable
const CONFIG = {
  ENABLE_PERFORMANCE_TRACING: process.env.ENABLE_PERFORMANCE_TRACING === 'true',
}

if (CONFIG.ENABLE_PERFORMANCE_TRACING) {
  // tracing code
}

// ❌ NODE_ENV check
if (process.env.NODE_ENV === 'development') {
  // tracing code
}
```

## Error Handling

Use `unknown` in catch blocks, never `any`. Narrow type before accessing properties. Use `instanceof Error` check, fall back to `String(error)`.

## Routes

Always use routes from `@/app/routes` instead of hardcoded paths.

```tsx
// ✅ Static
import { routes } from '@/app/routes'
;<Link href={routes.home.path}>Home</Link>

// ✅ Dynamic
import { routes, resolvePath } from '@/app/routes'
;<Link href={resolvePath(routes.events.eventId.checkin, { eventId: event.id })}>Check In</Link>
```

## React Hooks

Avoid `useEffect` - compute during render, handle in event callbacks, use explicit branching. Don't use `useEffect` for: transforming props to state, derived values, fetching based on props, syncing state. Use `useEffect` only for: subscriptions, timers, DOM manipulation, imperative APIs (with cleanup).

```tsx
// ✅ Compute during render
function UserProfile({ user }) {
  const displayName = user.name ?? user.email ?? 'Anonymous'
  return <h1>{displayName}</h1>
}

// ✅ Explicit branching
function ProductDetails({ productId }) {
  if (!productId) return <div>No product selected</div>
  const product = useProduct(productId)
  if (!product) return <Loading />
  return <ProductView product={product} />
}

// ✅ Event handlers in callbacks
const handleSubmit = useCallback(
  (e) => {
    e.preventDefault()
    onSearch(query)
  },
  [query, onSearch]
)

// ✅ Memoization with correct deps
const total = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions])
```

**Decision tree**: Rendering? → `useMemo`/variable | User action? → callback | Side effect? → `useEffect` | Conditional UI? → `if/else` or `&&`

**Linting**: `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: error` (never disable without explanation)

## Data Fetching Hooks

**Standard Pattern: `useApiQuery`**

All component data fetching uses `useApiQuery`. For polling/manual control, use `fetchApiData` directly. The `useFetch` hook has been removed.

Prevent infinite loops in data fetching hooks by:

**Use refs for callbacks and options**: Store `onSuccess`, `onError`, `extractor`, `errorMessage`, and `operation` in refs to avoid dependency array issues.

```tsx
// ✅ Refs for callbacks/options
const onSuccessRef = useRef(onSuccess)
useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
const fetchData = useCallback(async () => {
  onSuccessRef.current?.(data)
}, [url, skip]) // Don't include callbacks/options

// ❌ Callbacks in deps cause loops
}, [url, skip, onSuccess]) // Loop if onSuccess isn't memoized
```

**Memoize URLs, extractors, and skip conditions**: Prevent unnecessary re-renders.

```tsx
// ✅ Memoized
const url = useMemo(() => resolvePath(routes.api.events.eventId, { eventId }), [eventId])
const extractor = useCallback((r) => r.event, [])
const shouldSkip = useMemo(() => !event?.id, [event?.id])

// ❌ Recreated every render
useApiQuery(resolvePath(...), (r) => r.event, { skip: !event?.id })
```

**Avoid redundant dependencies**: Don't include values in `useEffect` deps that are already in the callback's deps.

```tsx
// ✅ Only callback
const fetchData = useCallback(() => {...}, [url, skip])
useEffect(() => { fetchData() }, [fetchData])

// ❌ Redundant
useEffect(() => { fetchData() }, [fetchData, url, skip]) // url/skip already in fetchData deps
```

## Button Placement

**Prioritize right-side placement for mobile-friendly access**: Buttons should be positioned on the right side of containers when possible, as this aligns with thumb-friendly zones on mobile devices and improves accessibility.

```tsx
// ✅ Right-aligned button (mobile-friendly)
<div className="flex items-center justify-between">
  <span>Content</span>
  <Button>Action</Button>
</div>

// ✅ Right-side button in header
<div className="flex items-center justify-between">
  <h3>Title</h3>
  <Button>Action</Button>
</div>

// ⚠️ Consider: Left-aligned buttons are acceptable when following established patterns or when right placement would conflict with other UI elements
```

## Component Extraction

Extract JSX blocks that are more than a few lines, or when mapping over data to render similar structures.

```tsx
// ✅ Extract complex/repeated JSX
function EventCard({ event }: { event: Event }) {
  return <div>...</div>
}
{
  events.map((event) => <EventCard key={event.id} event={event} />)
}

// ✅ OK: Simple one-liners can stay inline
{
  items.map((item) => <span key={item.id}>{item.name}</span>)
}
{
  isLoading && <Spinner />
}
```

**Extraction Thresholds**:

- **Always extract**: Conditional blocks (modals, dialogs, tooltips) over **30 lines**
- **Always extract**: Any JSX block over **40 lines**
- **Consider extracting**: Blocks 20-40 lines with complex structure, multiple handlers, or that hurt readability

```tsx
// ❌ Large conditional block inline
{
  isModalOpen && <div className="fixed inset-0 ...">{/* 30+ lines */}</div>
}

// ✅ Extract to helper component
function QRCodeModal({
  isOpen,
  onClose,
  eventId,
}: {
  isOpen: boolean
  onClose: () => void
  eventId: string
}) {
  if (!isOpen) return null
  return <div className="fixed inset-0 ...">{/* modal content */}</div>
}
```

**State Management**: When extracting, decide where state should live:

- **Keep state in parent** if it's needed elsewhere or affects multiple components
- **Move state to extracted component** if it's only used within that component (e.g., modal open/close)

```tsx
// ✅ State in parent - needed elsewhere
function Parent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Open</Button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

// ✅ State in extracted component - only used internally
function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return isOpen ? <div>{children}</div> : <Button onClick={() => setIsOpen(true)}>Open</Button>
}
```

**Component Definitions**:

- **Never use `useMemo` for component definitions** - `useMemo` is for values, not components
- **Always extract components defined inside other components** - they're recreated every render, making `memo()` ineffective
- **Extract to same file above parent**, or separate file if reused elsewhere

```tsx
// ❌ Component defined inside - recreated every render
function Parent() {
  const Child = memo(function Child({ prop }: { prop: string }) {
    return <div>{prop}</div>
  })
  return <Child prop="value" />
}

// ✅ Extract outside - stable reference
const Child = memo(function Child({ prop }: { prop: string }) {
  return <div>{prop}</div>
})

function Parent() {
  return <Child prop="value" />
}
```

## Helper Functions

Keep helper functions private to their component module unless they're used by another module.

**Making functions private**: Don't export helpers used only within the same file. Use `function` declarations (not arrow functions).

**Decision rule**: Keep private if only used in one file/module. Extract to shared location if imported by 2+ modules.

## Never Do These

- ❌ Never read `process.env` directly in application code (use `@/shared/config`)
- ❌ Never hardcode routes (use `@/app/routes`)
- ❌ Never use `any` type (use `unknown` and narrow)
- ❌ Never define components inside other components
- ❌ Never use `useEffect` for derived state or prop transformations
- ❌ Never disable ESLint rules without explanation
- ❌ Never skip authentication checks in API routes
- ❌ Never skip input validation

## Type Safety

- Always use explicit return types for exported functions
- Use `type` imports for types/interfaces: `import type { ... }`
- Narrow `unknown` errors: `if (error instanceof Error)`
- Prefer `const` assertions for literal types
- Use Zod schemas for runtime validation (never trust API responses)

## Validation

- All API route inputs must be validated with Zod schemas
- Use Zod schemas from `src/shared/[domain]/schema.ts`
- Return 400 status for validation errors
- Never trust user input without validation

## Error Handling

- API routes: Return `Response.json({ error: string }, { status: number })`
- Client hooks: Throw errors in `queryFn`, let TanStack Query handle them
- Always log errors server-side before returning to client
- Use specific error messages (avoid generic "Something went wrong")

## File Naming

- Components: `PascalCase.tsx` (e.g., `ShotDetail.tsx`)
- Hooks: `camelCase.ts` (e.g., `hooks.ts` in domain folders)
- Utilities: `kebab-case.ts` (e.g., `google-sheets.ts`)
- API routes: `route.ts` (Next.js convention)
- Schemas: `schema.ts` (Zod schemas)

## Common Mistakes

1. **Hardcoding routes** - Always use `AppRoutes`/`ApiRoutes`
2. **Direct `process.env` access** - Use `config` from `@/shared/config`
3. **Missing authentication** - All API routes need `getSession()` check
4. **Skipping validation** - All inputs need Zod validation
5. **Arrow function components** - Use function declarations
6. **`useEffect` for derived state** - Compute during render
