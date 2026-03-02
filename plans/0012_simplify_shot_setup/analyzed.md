# Codebase Analysis: 0012_simplify_shot_setup

## Key Files

| File | Role |
|------|------|
| `src/shared/shots/schema.ts` | Zod schema — `doseGrams`, `yieldGrams`, `yieldActualGrams` are currently required |
| `src/db/schema.ts` | DB schema — same 3 fields have `.notNull()` |
| `src/app/api/shots/route.ts` | POST handler — extra `yieldActualGrams` check at L294-300, flowRate at L302-307, `String()` wrapping at L312-327 |
| `src/app/api/shots/[id]/route.ts` | PATCH handler — flowRate at L140-145, `String()` wrapping at L153-158 |
| `src/components/shots/form/SectionBasics.tsx` | Setup section — BeanSelector L40-45, GrinderSelector L47-52, MachineSelector L54-61, uses `useFormContext` |
| `src/components/shots/form/SectionRecipe.tsx` | Recipe section — configurable steps, PreviousShotRow at L320-322, insert BeanSelector before L657 |
| `src/components/shots/form/SectionResults.tsx` | Results section — yieldActualGrams at L384-417 |
| `src/components/shots/form/PreviousShotRow.tsx` | Previous shot display — View button exists, TruncatedNotes has its own collapse |
| `src/components/shots/form/hooks.ts` | `useShotPrePopulation` — priority chain L108-114, returns `{ previousShotId, resetPrePopulation }` |
| `src/components/shots/form/ShotEditForm.tsx` | Edit form — needs doseGrams/yieldGrams optional handling (L40 pattern) |
| `src/components/beans/BeanSelector.tsx` | BeanSelector component — props: value, onChange, error?, id? |

## Icons
- Project uses `@heroicons/react/24/outline` (NOT lucide-react)
- `ChevronDownIcon`, `ChevronUpIcon` already used in flavor wheel, shot detail, shots page

## Collapse/Expand Patterns
- `useState(false)` + toggle — used in TruncatedNotes, NestedBodySelector
- No persistence needed for these collapses

## Gotchas
- POST route wraps values with `String()` — must handle null: use `data.doseGrams != null ? String(data.doseGrams) : null`
- PATCH route has identical pattern
- ShotEditForm already handles optional `yieldActualGrams` (L40) — extend to doseGrams/yieldGrams
- flowRate computation appears in both POST and PATCH — both need null guard
- BeanSelector requires `value` (string) and `onChange` — same react-hook-form pattern works in SectionRecipe
- Dose/Yield quick-select buttons in SectionRecipe use local state — still work when fields are optional
