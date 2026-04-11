# Problem Statement

Equipment (grinders, machines, tools) is currently stored in three separate tables with only a `name` field — no rich attributes, no purchase link tracking, no AI-assisted data entry. The existing admin pages are bare-bones name-only forms. The goal is to unify the data model, add rich type-specific attributes via a `specs` JSONB column, track purchase links with affiliate support, and provide AI-powered search to discover both equipment details and purchase links automatically.

# Plan summary

Merge `grinders`, `machines`, `tools` into a unified `equipment` table. Add `admin_approved` column, `brand` text column, and `specs` JSONB column for type-specific attributes. Add `equipment_purchase_link` table. Build a unified admin management page. Add two AI-powered admin tools: (1) equipment search — admin types a product name → AI returns structured equipment data (brand, specs, description) → admin reviews and saves; (2) purchase link search — AI finds retailer URLs for existing equipment. Both use `generateText()` via the existing `@ai-sdk/openai` SDK.

# Scope

- Unified `equipment` table replaces separate `grinders`, `machines`, `tools` tables
- Unified `user_equipment` junction table replaces three `equipment_users_*` tables
- New `admin_approved` boolean column for admin curation
- New `brand` text column for manufacturer/brand name
- New `specs` JSONB column for type-specific attributes (burr size, boiler type, etc.)
- New `equipment_purchase_link` table for retailer URLs with affiliate tracking
- AI-powered equipment search: admin enters a product name → OpenAI returns structured equipment data with specs
- AI-powered purchase link search: find retailer URLs for existing equipment
- Data migration copies existing rows; existing seeded/global equipment gets `admin_approved = true`
- All existing API endpoints keep their URLs and response shapes (backward compatible)
- New unified admin equipment management page at `/pucking-admin/equipment`
- Old tables kept as deprecated in schema (no DROP)

### Out of scope

- Dropping old tables (future cleanup migration)
- Unifying frontend hooks into `useEquipment(type)` (separate effort)
- Converting `shots.tools_used` jsonb to junction table
- Public-facing purchase link display / affiliate URL rendering (future phase)
- Live price scraping / automated link verification
- Sharing equipment between users
- Equipment analytics or stats

# Solution

## Data Model

### `equipment` table (unified)
| Column | Type | Description |
|---|---|---|
| `id` | text PK | Preserves original IDs; new rows get `eq_*` |
| `type` | text NOT NULL | `'grinder' \| 'machine' \| 'tool'` |
| `name` | text NOT NULL | Equipment model name (e.g. "Opus", "Linea Mini") |
| `brand` | text nullable | Manufacturer (e.g. "Fellow", "La Marzocco", "Comandante") |
| `slug` | text nullable | Tools only (unique where not null) |
| `description` | text nullable | Freeform description/notes |
| `specs` | jsonb nullable | Type-specific attributes; schema varies by `type` (see below) |
| `created_by` | text FK → users | Who created this row |
| `is_global` | boolean default true | Visible to all users in browse/catalog |
| `admin_approved` | boolean default false | Admin has reviewed and approved |
| `image_id` | text FK → images | Optional photo (grinders/machines) |
| `created_at` | timestamp | When created |
| UNIQUE(`type`, `name`) | | Name unique within type |

### `specs` JSONB — type-specific attributes

JSONB column allows each equipment type to have different attributes without schema migrations. Typed Zod schemas define the shape per type; these schemas are the **single source of truth** for both API validation and admin form rendering.

#### Typed Zod specs schemas (in `src/shared/equipment/schema.ts`)

Replace the current loose `equipmentSpecsSchema = z.record(z.string(), z.unknown())` with typed per-type schemas. Every field is `.optional()`. The generic `equipmentSpecsSchema` becomes a union used for API validation.

```ts
export const grinderSpecsSchema = z.object({
  burr_type: z.enum(["flat", "conical", "blade"]).optional(),
  burr_size_mm: z.number().optional(),
  burr_material: z.enum(["steel", "ceramic", "titanium_coated"]).optional(),
  adjustment: z.enum(["stepped", "stepless"]).optional(),
  grind_steps: z.number().int().optional(),
  motor_type: z.enum(["AC", "DC", "brushless_DC", "manual"]).optional(),
  single_dose: z.boolean().optional(),
  retention_g: z.number().optional(),
  weight_kg: z.number().optional(),
  dimensions: z.string().optional(),
  wattage: z.number().optional(),
});

export const machineSpecsSchema = z.object({
  machine_type: z.enum(["single_boiler", "thermocoil", "thermoblock", "heat_exchanger", "dual_boiler", "lever", "manual_lever"]).optional(),
  boiler_material: z.enum(["brass", "stainless", "aluminum"]).optional(),
  pid: z.boolean().optional(),
  pump_type: z.enum(["vibratory", "rotary", "manual"]).optional(),
  pressure_profiling: z.boolean().optional(),
  flow_control: z.boolean().optional(),
  pre_infusion: z.boolean().optional(),
  portafilter_mm: z.number().optional(),
  water_reservoir_ml: z.number().optional(),
  plumb_in: z.boolean().optional(),
  weight_kg: z.number().optional(),
  dimensions: z.string().optional(),
  wattage: z.number().optional(),
  voltage: z.string().optional(),
});

export const toolSpecsSchema = z.object({
  material: z.string().optional(),
  compatible_portafilter_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
});

/** Lookup: equipment type → its specs schema. */
export const specsByType = {
  grinder: grinderSpecsSchema,
  machine: machineSpecsSchema,
  tool: toolSpecsSchema,
} as const;
```

The loose `equipmentSpecsSchema` stays as a permissive fallback for existing API routes (`z.record(z.string(), z.unknown())`). The typed schemas are used for form rendering and optional stricter validation in admin endpoints.

#### Schema-driven form rendering helper

A generic helper function `zodSchemaToFields(schema: ZodObject)` introspects a Zod object schema and returns a field descriptor array that the form component renders. It maps Zod types to input controls:

| Zod type | Input control |
|---|---|
| `z.enum([...])` | `<select>` with enum values as options |
| `z.number()` | `<input type="number">` |
| `z.boolean()` | `<input type="checkbox">` |
| `z.string()` | `<input type="text">` |

Each field descriptor includes: `key`, `label` (auto-generated from key: `burr_size_mm` → "Burr size mm"), `inputType`, `options` (for enums). All fields are optional (empty → omitted from JSON).

**UI metadata** (units, step values, conditional visibility) is provided via a separate lightweight `fieldMeta` map alongside the schema — not embedded in the Zod schema itself:

```ts
const grinderFieldMeta: Partial<Record<keyof GrinderSpecs, FieldMeta>> = {
  burr_size_mm: { unit: "mm" },
  retention_g: { unit: "g", step: 0.1 },
  weight_kg: { unit: "kg", step: 0.1 },
  wattage: { unit: "W" },
  grind_steps: { showWhen: { field: "adjustment", value: "stepped" } },
};
```

This keeps the Zod schema as the single source of truth for field names, types, and enum options, while the meta map decorates with display hints.

### `equipment_purchase_link` table
| Column | Type | Description |
|---|---|---|
| `id` | text PK | nanoid with `epl_` prefix |
| `equipment_id` | text FK → equipment | On delete cascade |
| `marketplace` | text NOT NULL | Retailer name (e.g. Amazon, Whole Latte Love, Prima Coffee) |
| `affiliate_program` | text nullable | Program handling commission (e.g. Amazon Associates, Impact) |
| `base_url` | text NOT NULL | Clean product URL without affiliate parameters |
| `affiliate_tag` | text nullable | Tracking parameter appended at render time |
| `price_usd` | numeric(10,2) nullable | Manually cached price in USD for display |
| `region` | text NOT NULL default 'US' | Market this listing applies to |
| `is_canonical` | boolean default false | Marks the manufacturer's official product page |
| `approved_by_user_id` | text FK → users nullable | Admin who approved; 403 for non-admins |
| `created_at` | timestamp | When the listing was added |
| `updated_at` | timestamp | When any field was last modified |
| `last_verified_at` | timestamp nullable | When the link was last confirmed live/accurate |
| `deactivated_at` | timestamp nullable | When deactivated; null means currently active |

### `user_equipment` junction table
| Column | Type | Description |
|---|---|---|
| `user_id` | text FK → users | On delete cascade |
| `equipment_id` | text FK → equipment | On delete cascade |
| `created_at` | timestamp | When saved to collection |
| PK(`user_id`, `equipment_id`) | | Composite primary key |

### Shots table changes
- `grinder_id` and `machine_id` columns stay as-is
- FK constraints re-pointed from `grinders`/`machines` to `equipment`

## API Strategy

All existing user-facing endpoints keep their URLs and response shapes. Internally they swap from querying separate tables to querying `equipment` filtered by `type`.

### Admin API updates
- Existing admin equipment endpoints updated to query unified `equipment` table
- Extended PATCH to support `admin_approved`, `is_global`, `brand`, `specs`, `name`, `slug`, `description`, `image_id`
- New unified `GET /api/admin/equipment` with `?type=` filter
- New unified `PATCH /api/admin/equipment/:id` for full field editing

### Purchase link API (admin only)
- `GET /api/admin/equipment/:id/links` — list all purchase links for an equipment item
- `POST /api/admin/equipment/:id/links` — create a purchase link manually
- `PATCH /api/admin/equipment/links/:linkId` — update (incl. approve/deactivate)
- `DELETE /api/admin/equipment/links/:linkId` — hard delete
- `POST /api/admin/equipment/:id/search-links` — AI-powered link search

### AI-powered equipment search

**Endpoint:** `POST /api/admin/equipment/search`

**Purpose:** Admin enters a product name (e.g. "Niche Zero grinder") → AI returns a fully-populated equipment record with brand, type, description, and specs filled in → admin reviews, edits, and saves.

**Flow:**
1. Admin types product name into search field on admin equipment page
2. `POST /api/admin/equipment/search` with `{ query: "Niche Zero grinder" }`
3. Server calls `generateText()` via `createSuggestionLanguageModel()`
4. **System prompt** instructs the model to identify the equipment and return structured JSON:
   ```json
   {
     "name": "Niche Zero",
     "brand": "Niche",
     "type": "grinder",
     "description": "Single-dose conical burr grinder designed for home espresso and filter brewing",
     "specs": {
       "burr_type": "conical",
       "burr_size_mm": 63,
       "burr_material": "steel",
       "adjustment": "stepless",
       "motor_type": "brushless_DC",
       "single_dose": true,
       "retention_g": 0.2,
       "weight_kg": 7.3,
       "wattage": 250
     }
   }
   ```
5. Validates response with Zod schema
6. Returns candidate equipment data to admin UI (NOT auto-saved)
7. Admin reviews/edits in a pre-filled form, then saves → `POST /api/admin/equipment`

**Key design decisions:**
- Uses `generateText()` with structured output — not streaming, need full response
- Reuses existing OpenAI config and `createSuggestionLanguageModel()` from `src/lib/ai-suggestions/model.ts`
- Gracefully returns 503 if `OPENAI_API_KEY` is not configured
- No metering/quota — admin-only feature
- Results are suggestions only — admin must review and save
- Spec schemas are intentionally lenient (all fields optional) since AI may not know every attribute

### AI-powered purchase link search

**Endpoint:** `POST /api/admin/equipment/:id/search-links`

**Flow:**
1. Admin clicks "Find Links" on equipment detail page
2. Server fetches equipment row (name, brand, type) for context
3. Calls `generateText()` with prompt to find retailer URLs
4. Returns candidate links as structured JSON array
5. Admin reviews, edits, selects which to save → `POST /api/admin/equipment/:id/links`

**Same design pattern as equipment search — suggestions only, admin reviews before saving.**

## Admin Equipment Management Page

### List view (`/pucking-admin/equipment`)
- `GenericDataTable` with columns: Type (badge), Brand, Name, Global, Approved, Links count, Created, ID
- Filters: type dropdown, approval status
- Row actions: Edit, quick-toggle `admin_approved` and `is_global`
- Toolbar: "+ New Equipment" button, "Search (AI)" button
- "Search (AI)" → opens search modal: text input → calls `/api/admin/equipment/search` → shows pre-filled form with AI results → admin edits and saves
- Row click → detail page
- **Multi-select:** Checkbox column on left; header checkbox for select-all (current page). Bulk action bar appears above table when ≥1 rows selected — actions: "Approve selected", "Unapprove selected", "Make global", "Make private", "Clear selection". Each bulk action calls `PATCH /api/admin/equipment/:id` per row (sequential, not batched) and invalidates the query cache once after all complete.

### Detail/edit view (`/pucking-admin/equipment/[id]`)
- Full equipment detail card with all fields including brand and specs
- Edit form for: name, brand, slug (tools), description, specs (dynamic form by type), `is_global`, `admin_approved`
- Specs editor: renders form fields based on equipment type (dropdown/number/checkbox per spec field)
- Image management: thumbnail, upload/remove
- **Purchase links section:**
  - Table of existing links (marketplace, URL, price, region, canonical, approved, verified, active)
  - "Add Link" button → manual form
  - "Find Links (AI)" button → calls search-links → review modal
  - Per-link actions: edit, approve/unapprove, verify, deactivate/reactivate, delete
- Usage stats: shots count, user collection count

### Specs editor — schema-driven form mode

Replace the raw JSON textarea with a dual-mode editor that toggles between **Form** and **JSON** views. The form is **generated from the typed Zod specs schemas** — not a hardcoded field list.

**Form mode (default):** Calls `zodSchemaToFields(specsByType[equipmentType])` to get field descriptors, then renders each as the appropriate input control. All fields optional; empty fields omit key from JSON. Field metadata (units, step values, conditional visibility) comes from a companion `fieldMeta` map per type.

**JSON mode:** Raw JSON textarea (current behavior). Pre-filled from form state on toggle. Edits in JSON mode update the form state when toggling back (invalid JSON shows error, blocks toggle).

**Toggle:** Small tab/pill toggle above the editor ("Form" / "JSON"). Switching syncs state bidirectionally. Default to Form.

**Reuse:** Extract as `EquipmentSpecsEditor` component used in: detail page, create modal, AI search review form. The `zodSchemaToFields` helper is generic and reusable for any `z.object()` schema — placed in `src/lib/zod-form-fields.ts`.

### Navigation
- Admin sidebar: replace "Grinders", "Machines", "Tools" with single "Equipment" entry

# Tasks (max 10 — implementation checklist)

## Phase 1 — Migration & schema

- [x] Write idempotent data migration SQL (`0028_unify_equipment.sql`): create `equipment` + `user_equipment` tables, copy data, re-point shots FKs
- [x] Update `src/db/schema.ts`: add `equipment` + `userEquipment` tables, update `shots` FKs, mark old tables deprecated
- [x] Add `createEquipmentId()` to `nanoid-ids.ts`; update Zod schemas with `equipmentTypeSchema`
- [x] Add `admin_approved`, `brand`, `specs` columns to `equipment` table; add `equipment_purchase_link` table; add `createPurchaseLinkId()` → `epl_` prefix; update migration SQL

## Phase 2 — Equipment API routes (12 files)

- [x] Update `GET`/`POST` grinders, machines, tools routes to query `equipment` filtered by type; use `userEquipment` for junction joins; update PATCH and my-collection routes

## Phase 3 — Admin API & shots/shares routes

- [x] Update admin equipment routes to use `equipment` table; extend PATCH for `admin_approved`, `is_global`, `brand`, `specs`, all fields; update shots/admin-shots/shares routes with aliased JOINs

## Phase 4 — Purchase link API & AI search

- [x] Add purchase link CRUD endpoints (`GET`/`POST`/`PATCH`/`DELETE` under `/api/admin/equipment/:id/links` and `/api/admin/equipment/links/:linkId`); enforce admin-only `approved_by_user_id`
- [x] Add `POST /api/admin/equipment/search`: AI equipment search — prompt with product name, return structured equipment data with brand + specs; Zod validation
- [x] Add `POST /api/admin/equipment/:id/search-links`: AI link search — prompt with equipment name/brand, return candidate retailer URLs; Zod validation

## Phase 5a — Admin equipment management page (base)

- [x] Build unified admin page at `/pucking-admin/equipment`: list with type filter + approval badges; "Search (AI)" button with search modal and pre-filled form; detail page with specs editor, image management, purchase links table, "Find Links (AI)" review modal; update admin sidebar nav

## Phase 5b — GenericDataTable multi-select & bulk actions

- [x] Add multi-select support to `GenericDataTable`: checkbox column on left; header checkbox toggles select-all for current page; expose `selectedIds` state and `onSelectionChange` callback; opt-in via `selectable` boolean prop (default false)
- [x] Add `bulkActions` prop to `GenericDataTable`: renders a sticky bar above the table when ≥1 rows selected — shows count ("N selected") and action buttons; `bulkActions: (selectedIds: string[], clearSelection: () => void) => React.ReactNode`
- [x] Wire up admin equipment list page: enable `selectable`, add bulk actions for "Approve" / "Unapprove" / "Make global" / "Make private"; each fires sequential `PATCH` calls and invalidates cache once at end; "Clear selection" button

## Phase 5c — Typed specs schemas & schema-driven form editor

- [x] Add typed Zod specs schemas to `src/shared/equipment/schema.ts`: `grinderSpecsSchema`, `machineSpecsSchema`, `toolSpecsSchema` (all fields `.optional()`); export `specsByType` lookup map; keep existing loose `equipmentSpecsSchema` as permissive fallback
- [x] Create `zodSchemaToFields()` helper in `src/lib/zod-form-fields.ts`: introspects a `z.object()` schema and returns field descriptors (`{ key, label, inputType, options? }`); maps `z.enum` → select, `z.number` → number, `z.boolean` → checkbox, `z.string` → text; reusable for any `z.object()` schema
- [x] Create `EquipmentSpecsEditor` component (`src/components/admin/equipment/EquipmentSpecsEditor.tsx`): accepts `type: EquipmentType`, `value: Record<string,unknown>`, `onChange`; calls `zodSchemaToFields(specsByType[type])` to generate form fields; uses per-type `fieldMeta` maps for units/step/conditional visibility
- [x] Add form/JSON toggle pill to `EquipmentSpecsEditor`: "Form" (default) shows schema-driven fields, "JSON" shows raw textarea; switching syncs state bidirectionally; invalid JSON blocks toggle-back and shows inline error
- [x] Replace JSON textarea in `AdminEquipmentDetailClient`, `AdminNewEquipmentModal`, and `AdminEquipmentAiSearchModal` with `<EquipmentSpecsEditor />`

## Phase 6 — Seed & tests

- [x] Update `scripts/seed.ts` to insert into `equipment` table with `admin_approved = true`; update `e2e/helpers/test-db.ts`

## Phase 7 — Enrich user-facing API responses with brand & images

- [x] Add `brand` field to `grinderSchema`, `machineSchema`, and `toolSchema` in `src/shared/equipment/schema.ts`; update `Grinder`, `Machine`, `Tool` types
- [x] Update `src/lib/equipment-list.ts` mapper to include `brand` in API responses for grinders, machines, and tools
- [x] Add `imageUrl` and `thumbnailBase64` to browse catalog API responses (`?scope=all`) so catalog items show thumbnails — currently only returned for user-scoped queries

## Phase 8 — Equipment page component refactor

Break `MyEquipmentPage.tsx` (600+ lines) into composable pieces:

- [x] Extract `EquipmentPhotoBlock` → `src/components/equipment/EquipmentPhotoBlock.tsx`
- [x] Extract `BrowseRow` → `src/components/equipment/BrowseCatalogRow.tsx`; add optional thumbnail prop to show catalog images
- [x] Extract per-type sections (grinders/machines/tools) into `EquipmentSection.tsx` — a generic section that accepts equipment type and renders: "my items" grid, "create" form, "browse catalog" list
- [x] Root `MyEquipmentPage.tsx` uses a single `<EquipmentSection />`: unified “Add equipment” (type + catalog filter + Create new + catalog list) and “My collection” (brew gear cards + tools list).

## Phase 9 — Browse catalog with images & brand

- [x] Show thumbnail + brand in `BrowseCatalogRow` when available; render a small image left of the name (32×32 rounded), brand as subtitle text
- [x] Show brand beneath equipment name in "My Equipment" cards (both grinder and machine cards)
- [x] Add brand field to "Create a grinder/machine" form — optional text input next to name

## Phase 10 — Inline image upload on equipment creation

- [x] Extend `POST /api/equipment/my/grinders` and `/my/machines` to accept optional `imageId` field when creating with `name`; link image at creation time
- [x] Update `myGrinderCollectionBodySchema` and `myMachineCollectionBodySchema` to accept optional `imageId`
- [x] Add photo picker to the "Create a grinder/machine" form — user can optionally pick a photo before clicking "Add to collection"; uses existing `resizeImageFileToJpegBlob` → upload → attach `imageId` to the creation payload

# Additional Tasks

- [x] Only have one "Manage equipment" link on the shot log page. Have it be a button at the bottom of the "Setup" section. (`SectionSetup.tsx`: full-width secondary `Button` after grinder/machine selectors when Setup is expanded; `ToolSelector` uses `hideEmptyStateEquipmentLink` in `SectionRecipe` so empty tools state has no duplicate link.)
- [x] Add additional equipment types: extended catalog Zod specs (grinder burr fields, espresso machine, kettle, scale, pour over, french press, moka pot, cold brew), `EQUIPMENT_TYPE_SCHEMAS`, `ADMIN_EQUIPMENT_TYPE_OPTIONS`, Drizzle `equipment.type` union, admin list filter + modals + AI search prompt, specs editor field meta and boolean handling.
- [x] User equipment page: all non-tool brew gear types (grinder, machine, kettle, scale, pour over, French press, moka pot, cold brew) in one “Brew gear” section with type filter, unified catalog (optional type chips when viewing all), create form type dropdown + name + brand; extra types use `/api/equipment/items` + `/api/equipment/my/items`; tools stay in a separate section.
- [x] Add icons to the `/equipment` catalog lists based on type (`EquipmentIcon` in `BrowseCatalogRow`; optional `className` on `EquipmentIcon`).
- [x] Equipment page layout: “My collection” first (no section heading/copy), independent “Show” type filter; “Add equipment” at bottom with catalog + create; “Create new” as primary control (`EquipmentSection.tsx`).
