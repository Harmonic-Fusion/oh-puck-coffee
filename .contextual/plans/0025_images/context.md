# Problem Statement

Users cannot attach photos to their espresso shots. Visual records of puck condition, crema, latte art, or channeling are valuable for diagnosing and refining technique. The system needs a generic image storage layer that supports shots today and can be extended to beans, equipment, and other domains in the future.

# Scope

- A generic `images` table decoupled from any single domain (shots, beans, etc.)
- A `shot_images` join table linking shots to images (many-to-many)
- Cloud storage backend (Google Cloud Storage or Cloudflare R2) — decision needed
- Client-side image resizing before upload to enforce size limits
- Server-side validation of upload size
- Number of photos per shot gated by entitlement (similar to `no-shot-view-limit`), with a free-tier default
- Thumbnail generation (stored as PNG bytes in DB) for fast list-view rendering without hitting cloud storage
- API endpoints for uploading, listing, and deleting images
- UI for capturing/selecting photos during shot logging and viewing them on shot detail

# Table Structure Justification

## `images` table (generic, domain-agnostic)

| Column | Type | Rationale |
|---|---|---|
| `id` | `text` (nanoid) | Primary key, consistent with other tables |
| `url` | `text` | Full URL to the stored object in cloud storage. Allows the app to render images without knowing storage internals. |
| `thumbnail` | `bytea` | Small PNG thumbnail (~200px) stored directly in Postgres. Avoids a cloud storage round-trip for list views, shot cards, and previews. Kept small (~5-15 KB) so DB bloat is negligible. |
| `size_bytes` | `integer` | Original file size. Enables quota enforcement, usage analytics, and admin monitoring without querying cloud storage. Integer (not float) because file sizes are whole numbers. |
| `user_id` | `text` FK → users | Ownership. Required for access control (users can only manage their own images), quota tracking per user, and cascading deletes when a user account is removed. |
| `created_at` | `timestamp` | Standard audit column. |

## `shot_images` join table

| Column | Type | Rationale |
|---|---|---|
| `shot_id` | `text` FK → shots | Links to the shot this image belongs to. CASCADE delete — when a shot is deleted, the join row is removed. |
| `image_id` | `text` FK → images | Links to the generic image. CASCADE delete — when an image is deleted, the join row is removed. |
| `created_at` | `timestamp` | When the image was attached (allows ordering photos within a shot). |
| PK | composite (`shot_id`, `image_id`) | Prevents duplicate attachments. |

**Why a join table instead of a `shot_id` column on `images`?**

1. **Future extensibility** — When we add photos for beans, equipment, etc., we add new join tables (`bean_images`, `equipment_images`) without modifying the `images` table at all.
2. **Many-to-many** — While unlikely today, a single image could theoretically be linked to multiple entities (e.g., same photo shown on a shot and the bean page).
3. **Clean deletion semantics** — Deleting a shot removes the join row; the image itself can remain (or be garbage-collected separately) without orphaning FK references across domains.
4. **Single responsibility** — The `images` table only knows about storage; domain tables only know about their own relationships.

# Solution

## Storage Backend

**Cloudflare R2** — S3-compatible, zero egress fees. Config env variables:

- `CLOUDFLARE_R2_ACCOUNT_ID` — Cloudflare account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID` — R2 API token access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` — R2 API token secret key
- `CLOUDFLARE_R2_BUCKET_NAME` — R2 bucket name
- `CLOUDFLARE_R2_PUBLIC_URL` — Public URL prefix for the bucket (e.g., via custom domain or R2.dev subdomain)

All accessed via `config` in `src/shared/config.ts` (never `process.env` directly).

## Upload Flow

1. **Client-side**: Resize image to max 1920px on longest edge using canvas API, convert to JPEG at ~80% quality. This typically reduces phone photos from 5-10 MB to 200-500 KB.
2. **Client uploads** the resized image to a `POST /api/images` endpoint.
3. **Server-side**: Validates file size (max 5 MB after client resize — a safety net), generates a ~200px PNG thumbnail, uploads original to cloud storage, stores the image record + thumbnail in DB.
4. **Server responds** with the image record (id, url, thumbnail as base64).
5. **Client** then associates the image with the shot via the shot creation or a separate `POST /api/shots/:id/images` endpoint.

## Thumbnail Strategy

- Generated server-side using `sharp` (already a common Next.js dependency).
- Max 200px on longest edge, PNG format, typically 5-15 KB.
- Stored as `bytea` in Postgres — avoids a second cloud storage call for every list-view render.
- Served inline as base64 data URIs in API responses for shot lists.

## Entitlement / Feature Gating

- New entitlement: `photo-uploads` — unlocks higher/unlimited photo limits.
- **Per-shot limit**: Free tier capped at 3 photos per shot. Config value: `config.maxPhotosPerShot` (default: 3).
- **Total user storage quota**: Free tier capped at 50 MB total across all images. Config value: `config.maxImageStorageBytes` (default: 52428800).
- Paid tier: higher or unlimited limits via entitlement (both per-shot and total storage).
- Enforcement: server-side check on `POST /api/shots/:id/images` — reject if per-shot count OR total user storage quota exceeded.

## API Endpoints

- `POST /api/images` — Upload an image (multipart/form-data). Returns image record.
- `DELETE /api/images/:id` — Delete an image (removes from cloud storage + DB).
- `POST /api/shots/:id/images` — Attach an existing image to a shot.
- `DELETE /api/shots/:id/images/:imageId` — Detach an image from a shot.
- `GET /api/shots/:id/images` — List images for a shot.

## UI Changes

- **Shot log form**: Add a photo capture/upload section (camera button + file picker).
- **Shot detail page**: Display attached photos in a gallery/carousel.
- **Shot list/cards**: Show thumbnail indicator if photos are attached.

# Tasks

## Phase 1: Database & Storage Foundation

- [x] Add `images` table to `src/db/schema.ts`
- [x] Add `shot_images` join table to `src/db/schema.ts`
- [x] Generate and edit migration (idempotent guards)
- [x] Add new config values to `src/shared/config.ts` (cloud storage credentials, `maxPhotosPerShot`)
- [x] Add new entitlement key to `src/shared/entitlements.ts`
- [x] Add new routes to `src/app/routes.ts`

## Phase 2: Storage & API Layer

- [x] Set up cloud storage client (GCS or R2 — pending clarification)
- [x] Create `src/lib/images.ts` utility (upload to storage, generate thumbnail with `sharp`, delete from storage)
- [x] Implement `POST /api/images` (upload endpoint with size validation)
- [x] Implement `DELETE /api/images/:id` (with cloud storage cleanup)
- [x] Implement `POST /api/shots/:id/images` (attach, with entitlement check)
- [x] Implement `DELETE /api/shots/:id/images/:imageId` (detach)
- [x] Implement `GET /api/shots/:id/images` (list with thumbnails)
- [x] Add Zod schemas for image-related requests/responses in `src/shared/images/schema.ts`

## Phase 3: Client-Side Upload & UI

- [x] Create client-side image resizer utility (`src/lib/image-resize.ts`)
- [x] Create `src/components/shots/ShotPhotoUpload.tsx` (camera + file picker + preview)
- [x] Create `src/components/shots/ShotPhotoGallery.tsx` (view photos on shot detail)
- [x] Integrate photo upload into shot log form
- [x] Add photo thumbnails to shot cards/list view
- [x] Add TanStack Query hooks for image operations in `src/components/shots/hooks.ts`

## Phase 4: Polish & Gating

- [x] Wire entitlement check into UI (show upgrade prompt when at photo limit)
- [x] Add photo count indicator on shot cards
- [x] Handle loading/error states for image upload
- [ ] Test with large images to verify client-side resize works correctly
- [x] Refactor ShotPhotoUpload to use react-dropzone (shadcn-dropzone pattern) with drag-and-drop zone UI and shadcn Button components

## Additional Tasks

- [x] Sourness and Bitterness should be on a 0 to 4 scale. Start counting at 0.
- [x] Default `CLOUDFLARE_R2_PUBLIC_URL` to `https://{account}.r2.cloudflarestorage.com/{bucket}` with upload readiness fallback when credentials are incomplete
- [x] Consolidate "Edit Inputs" into a single modal with category-based navigation and scrolling
- [x] Move ShotPhotoUpload into SectionBrewing and add to reorderable steps
- [ ] Test with large images to verify client-side resize works correctly

---

## Plan summary: Dashboard refresh (see `context-dashboard.md`)

Work for `/stats` and `/shots` is specified in **`context-dashboard.md`** (not images). Condensed: **10 tasks** — overview stats API + six cards, heatmap fixes, **shared `flavor-stats` extraction** aligned with `FlavorRatingsChart` + `FlavorBubbleChart` using `ChartContainer`, Dial-In secondary Y-axis for rating, URL `useFilterParams`, `StickyFilterBar`, wire both pages and remove legacy TanStack column filters on history. **`ChartContainer` deep dive** in that doc covers **`controllers` vs `xController`** (X-axis / metric selection below chart), migrating stats charts off duplicated card shells, shared toolbar `<select>` styling, and optional tooltip/`ToggleGroup` extraction.
