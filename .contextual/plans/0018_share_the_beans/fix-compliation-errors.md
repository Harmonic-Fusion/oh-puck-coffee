# Fix React Compiler Memoization Warning

You are fixing a React Compiler warning in a React/Next.js component:

```
warning  Compilation Skipped: Use of incompatible library
This API returns functions which cannot be memoized without leading to stale UI.
To prevent this, by default React Compiler will skip memoizing this component/hook.
However, you may see issues if values from this API are passed to other components/hooks
that are memoized.
```

This warning means the component uses a third-party hook or API that returns unstable references (new object/function instances each render), which prevents React Compiler from safely auto-memoizing the component.

Verfiy with `pnpm lint`

## Your Task

Given the component source code provided below, diagnose the root cause of the warning and apply the most appropriate fix.

## Diagnosis Steps

1. Identify which hook on or near the flagged line returns unstable values (e.g. `useForm`, `useRouter`, `useDrag`, `useAnimate`, etc.)
2. Determine whether those unstable values flow into memoized child components or hooks
3. Choose the fix strategy below that best matches the situation


## Fix Strategies (in order of preference)

### Strategy 1: Upgrade the offending library
If the library has a newer version with React Compiler compatibility (e.g. react-hook-form v8+), upgrade it. Research and check the library's changelog or GitHub for "React Compiler" support.

```bash
npm install react-hook-form@latest
```

### Strategy 2: Isolate the unstable hook into a wrapper component
Extract the part of the component that uses the incompatible hook into a separate non-memoized wrapper, keeping memoized children clean.

```tsx
// Before: everything in one component
export function ShotForm() {
  const form = useForm(); // unstable
  return <MemoizedChild onChange={form.setValue} />;
}

// After: split the boundary
export function ShotFormShell() {
  "use no memo"; // opt out only this shell
  const form = useForm();
  return <ShotFormInner form={form} />;
}

const ShotFormInner = React.memo(({ form }) => {
  // stable, memoizable
});
```

### Strategy 3: Stabilize references with `useCallback` / `useMemo`
If the library exposes primitive values or you control the hook, wrap returned functions to give them stable references.

```tsx
const { setValue } = useForm();
const stableSetValue = useCallback((...args) => setValue(...args), [setValue]);
```

> ⚠️ Only works if the library's functions themselves are stable enough to list as deps. Does not help if the function identity changes every render regardless.

### Strategy 4: Opt out with `"use no memo"`
Do not use this strategy. Document each instance and why.
Add a `// TODO: revisit when [library] adds React Compiler support` comment if using this.

---

## Rules for Applying the Fix

- **Do not change component behavior or UI output**
- **Do not remove or alter existing TypeScript types**
- **Do not introduce new dependencies unless Strategy 1 applies**
- Prefer the lowest-impact fix that resolves the warning
- If splitting the component (Strategy 2), keep both pieces in the same file unless the inner component exceeds ~150 lines

---

## Output Format

Return:
1. **Root cause** — one sentence identifying the offending hook/line
2. **Chosen strategy** — which strategy and why
3. **Updated component code** — the full fixed file
