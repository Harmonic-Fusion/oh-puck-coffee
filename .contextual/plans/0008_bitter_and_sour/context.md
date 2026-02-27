# Problem Statement

Add two new tasting inputs (bitter and sour) to the Tasting section of the shot logging form. These inputs should use 1-5 scales similar to the existing Quality input, but with colored dots instead of logos in the center of the slider. Both inputs should default to hidden/off and include descriptive labels for each major number on the scale.

# Scope

## Requirements

1. **New Inputs**: Add `bitter` and `sour` as optional 1-5 scale inputs in the Tasting section
2. **Scale Format**: 1-5 scale with 0.5 step increments (same as Quality and Rating)
3. **Visual Design**: 
   - Use colored dot instead of logo in slider center
   - Dot color should match the value on the scale
   - Sour: color scale from none/neutral to bright (e.g., yellow/lemon)
   - Bitter: color scale from none/neutral to dark (e.g., dark brown/black)
4. **Labels**: Add descriptive text labels for each major number (1, 2, 3, 4, 5) similar to Quality labels
5. **Default State**: Both inputs default to `visible: false` in the Tasting section configuration
6. **Data Storage**: Store values in database and include in Zod schemas
7. **Display**: Show values in shot detail views (ShotDetail, SharedShotView)

## Boundaries

- Only affects Tasting section, not Results section
- Optional fields (can be null/undefined)
- Follows existing patterns for Quality and Rating inputs
- Uses existing Slider component with modifications for colored dots

## Dependencies

- Database schema update required (add `bitter` and `sour` columns to `shots` table)
- Zod schema update required (`createShotSchema` and `shotSchema`)
- Slider component modification (support colored dot instead of logo)
- Tasting section configuration update (`DEFAULT_TASTING_STEPS`)
- **API routes need updating** — all 3 GET selects and both POST/PATCH explicitly enumerate fields:
  - `src/app/api/shots/route.ts` (GET select + POST insert)
  - `src/app/api/shots/[id]/route.ts` (GET select + PATCH update)
  - `src/app/api/shares/[uid]/route.ts` (GET select)
- **TypeScript interfaces need updating**:
  - `ShotWithJoins` in `src/components/shots/hooks.ts`
  - `SharedShot` in `src/components/shots/SharedShotView.tsx`
- **Edit form** needs default values: `src/components/shots/form/ShotEditForm.tsx`
- **Exports** need new columns: `src/lib/google-sheets.ts` and `src/lib/csv-export.ts`
- Shot display components update (ShotDetail, SharedShotView)

# Solution

## Approach

1. **Database Schema**: Add `bitter` and `sour` as optional numeric columns (precision 3, scale 1) to match `shotQuality` and `rating` format
2. **Zod Schemas**: Add validation for bitter and sour with same 0.5 step refinement as Quality/Rating
3. **API Routes**: Add `bitter: shots.bitter` and `sour: shots.sour` to all 3 GET select objects, and add to POST insert `.values()` and PATCH update `.set()` objects
4. **TypeScript Interfaces**: Add `bitter: number | null` and `sour: number | null` to `ShotWithJoins` and `SharedShot`
5. **Slider Component Enhancement**: Add prop to support colored dot instead of logo, with color mapping function
6. **Tasting Configuration**: Add bitter and sour to `TastingStepId` type and `DEFAULT_TASTING_STEPS` with `visible: false`
7. **Color Scales**: 
   - Sour: Neutral/light gray (1) → bright yellow/lemon (5)
   - Bitter: Neutral/light gray (1) → dark brown/black (5)
8. **Labels**: Create descriptive labels for each scale value (1-5)
9. **Display Components**: Update ShotDetail and SharedShotView to show bitter/sour values when present
10. **Edit Form**: Add bitter/sour default values in ShotEditForm
11. **Exports**: Add bitter/sour to Google Sheets header + row and CSV header + row

## Reasoning

- Reusing existing Slider component maintains consistency and reduces code duplication
- Colored dots provide visual feedback that matches the taste characteristic (bright for sour, dark for bitter)
- Defaulting to hidden keeps the form clean while allowing users to enable if needed
- Following existing Quality/Rating patterns ensures consistency in validation and storage

# Tasks

## Phase 1: Database, Schema, and API Plumbing

- [x] Add `bitter` and `sour` columns to `shots` table in `src/db/schema.ts` (numeric, precision 3, scale 1, nullable)
- [x] Generate migration with `pnpm db:generate`, then edit the SQL to add `IF NOT EXISTS` guards for both columns
- [x] Add `bitter` and `sour` to both `createShotSchema` (optional, 0.5 step validation) and `shotSchema` (nullable number) in `src/shared/shots/schema.ts`
- [x] Add `bitter` and `sour` to the explicit `select()` in GET routes: `src/app/api/shots/route.ts`, `src/app/api/shots/[id]/route.ts`, and `src/app/api/shares/[uid]/route.ts`
- [x] Add `bitter` and `sour` to the `.values()` in POST (`src/app/api/shots/route.ts`) and `.set()` in PATCH (`src/app/api/shots/[id]/route.ts`)
- [x] Add `bitter: number | null` and `sour: number | null` to the `ShotWithJoins` interface in `src/components/shots/hooks.ts` and `SharedShot` interface in `src/components/shots/SharedShotView.tsx`

## Phase 2: Slider Component Enhancement

- [x] Enhance `Slider` component in `src/components/common/Slider.tsx`: add optional `thumbColor` prop (string). When provided, render a colored dot instead of the logo image, and use the color for both the filled track and tick dots instead of amber

## Phase 3: Tasting Section Integration

- [x] Add `"bitter"` and `"sour"` to `TastingStepId` union type and `DEFAULT_TASTING_STEPS` (visible: false) in `src/components/shots/form/SectionResults.tsx`
- [x] Create color interpolation functions for sour (neutral→bright yellow) and bitter (neutral→dark brown/black) that map values 1-5 to colors
- [x] Add `renderTastingStep` cases for bitter and sour using Slider with `thumbColor` set by the color functions, descriptive labels for 1-5, and `Controller` wrappers
- [x] Add `bitter` and `sour` default values to `ShotEditForm` in `src/components/shots/form/ShotEditForm.tsx`

## Phase 4: Display and Export

- [x] Update `ShotDetail` (`src/components/shots/log/ShotDetail.tsx`) and `SharedShotView` (`src/components/shots/SharedShotView.tsx`) to display bitter and sour values when present, using colored dots matching the slider color scales
- [x] Add "Bitter" and "Sour" columns to Google Sheets (`src/lib/google-sheets.ts` HEADER_ROW + appendShotRow) and CSV export (`src/lib/csv-export.ts` headers + row)

## Phase 5: Testing and Validation

- [x] Update test mocks with `bitter` and `sour` fields (`ShotDetail.test.tsx`, `ShotForm.test.tsx`)
- [ ] Test complete flow: form inputs, database persistence, display views, color interpolation, default hidden state, and Edit Inputs modal toggle

# Plan Summary

**Files requiring changes** (16 files):

| Layer | Files | Changes |
|---|---|---|
| DB/Schema | `src/db/schema.ts`, `src/shared/shots/schema.ts`, migration SQL | Add columns + validation |
| API | `src/app/api/shots/route.ts`, `src/app/api/shots/[id]/route.ts`, `src/app/api/shares/[uid]/route.ts` | Add to SELECT, INSERT, UPDATE |
| Types | `src/components/shots/hooks.ts`, `src/components/shots/SharedShotView.tsx` | Add to interfaces |
| UI Input | `src/components/common/Slider.tsx`, `src/components/shots/form/SectionResults.tsx`, `src/components/shots/form/ShotEditForm.tsx` | Colored dot mode + tasting steps |
| UI Display | `src/components/shots/log/ShotDetail.tsx`, `src/components/shots/SharedShotView.tsx` | Show values |
| Exports | `src/lib/google-sheets.ts`, `src/lib/csv-export.ts` | Add columns |
| Tests | `ShotDetail.test.tsx`, `ShotForm.test.tsx` | Update mocks |

**Key Design Decisions:**
- Reuse existing Slider component with `thumbColor` prop for colored dot mode
- Color scales: Sour (neutral→bright yellow), Bitter (neutral→dark brown)
- Default to hidden to keep form clean, users can enable via Edit Inputs modal
- Follow existing 0.5 step validation pattern for consistency

**Estimated Complexity**: Medium — database migration, component enhancement, and integration across 16 files. Phases are ordered by dependency.
