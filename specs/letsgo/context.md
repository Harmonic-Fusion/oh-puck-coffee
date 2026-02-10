# Coffee Brewing Tracker — Implementation Plan

## Context

Coffee shot tracking system originally described as a Google Forms + Sheets workflow. The goal is to build a web application that serves 1-15 people sharing an espresso setup. The app tracks shot recipes, subjective tasting notes (including an optional SCA Flavor Wheel section), computes analysis metrics, and displays a shot history with "God Shot" highlighting. On every new shot, a row is also appended to a user-configured Google Spreadsheet (mirroring the Google Forms experience). Users authenticate via Google OAuth and link their own Google Sheet. The architecture should allow for a future mobile app.

The project is greenfield and `assets/coffee_flavor_wheel.jpg` exist.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | Full-stack: React frontend + API route handlers in one project |
| Language | TypeScript | End-to-end type safety |
| Database | PostgreSQL 16 | Robust, runs as a docker-compose service |
| ORM | Drizzle ORM + `postgres` (postgres.js) | Type-safe schema, fast driver, clean migrations |
| Auth | Auth.js v5 (next-auth@5) + Google provider | Google OAuth flow, session management, token storage |
| Validation | Zod | Shared schemas between client and API routes |
| Styling | Tailwind CSS | Mobile-first, rapid development |
| Forms | React Hook Form + Zod resolver | Performant, validates against shared Zod schemas |
| Data fetching | TanStack Query | Client-side caching, optimistic updates |
| Tables | @tanstack/react-table | Sortable, filterable shot log |
| Google Sheets | `googleapis` (sheets v4) via user's OAuth token | Append-only row on shot creation |
| Containerization | Docker + docker-compose | PostgreSQL + Next.js, consistent dev/prod |
| Deployment | Railway | docker-compose compatible, managed Postgres option |

---

## Google Sheets Integration

**How it works:** When a shot is created via `POST /api/shots`, the server:
1. Inserts the shot into PostgreSQL (primary data store)
2. If the user has linked a Google Sheet (via the integrations domain), appends a row using their OAuth access token

This is **append-only** — no updates or deletes are sent to the spreadsheet.

**Auth flow:** Users sign in with Google OAuth (Auth.js). During the OAuth consent, we request the `https://www.googleapis.com/auth/spreadsheets` scope. The access token and refresh token are stored in the `integrations` table. The user then provides their spreadsheet ID in the app settings.

**Row format:** Timestamp, User, Bean, Roast Level, Roast Date, Dose, Yield, Grind Setting, Grinder, Machine, Brew Time, Brew Temp, Brew Ratio, Flow Rate, Days Post-Roast, Shot Quality, Flavor Profile, Texture, Tools Used, Notes, Flavor Wheel fields, Overall Preference

**Failure handling:** If the Sheets API call fails, the shot is still saved to PostgreSQL. The error is logged but does not block the API response.

---

## Integrations Domain

The `integrations` domain manages per-user Google Sheets connections.

### Data model: `integrations` table
- `id` (uuid PK)
- `userId` (uuid FK → users, unique — one integration per user)
- `provider` (text — `"google_sheets"` for now, extensible)
- `accessToken` (text, encrypted)
- `refreshToken` (text, encrypted)
- `tokenExpiresAt` (timestamp)
- `spreadsheetId` (text — the user's target Google Sheet ID)
- `spreadsheetName` (text — display name, fetched on link)
- `isActive` (boolean, default true)
- `createdAt`, `updatedAt`

### Flow
1. User signs in with Google (Auth.js handles the OAuth flow, stores session)
2. Auth.js callback stores Google access/refresh tokens on the `accounts` table (Auth.js built-in)
3. User navigates to Settings → Integrations, enters a Google Sheet URL/ID
4. App validates the sheet is accessible with the user's token (GET spreadsheet metadata)
5. On success, saves the `spreadsheetId` to the `integrations` table and writes a header row to the sheet
6. From now on, every `POST /api/shots` by this user also appends a row to their linked sheet

### Token refresh
When appending a row, if the access token is expired, use the refresh token to get a new one via Google's token endpoint. Update the stored tokens. If refresh fails, mark integration as `isActive: false` and surface an error in the UI.

---

## Project Structure (Next.js App Router, Domain-Organized)

Domains: **users**, **beans**, **equipment**, **shots**, **stats**, **integrations**

```
coffee/
├── INSTRUCTIONS.md
├── assets/
│   └── coffee_flavor_wheel.jpg
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── drizzle.config.ts
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── .env.example                         # DATABASE_URL, NEXTAUTH_*, GOOGLE_CLIENT_*
│
├── drizzle/
│   └── migrations/                      # Generated SQL migration files
│
└── src/
    ├── shared/                          # Shared schemas, types, constants (used by both app/ and API routes)
    │   ├── users/
    │   │   └── schema.ts               # Zod schema + inferred types
    │   ├── beans/
    │   │   ├── schema.ts
    │   │   └── constants.ts            # Roast levels
    │   ├── equipment/
    │   │   ├── schema.ts               # Grinder, machine Zod schemas
    │   │   └── constants.ts            # Tool options (WDT, puck screen, RDT)
    │   ├── shots/
    │   │   ├── schema.ts               # Shot creation/response Zod schemas
    │   │   └── constants.ts            # Flavor profiles, textures
    │   ├── flavor-wheel/
    │   │   └── constants.ts            # Full SCA wheel hierarchy, body adjectives, extra adjectives
    │   ├── integrations/
    │   │   └── schema.ts               # Integration Zod schemas
    │   └── index.ts
    │
    ├── db/
    │   ├── index.ts                    # postgres.js client + Drizzle instance
    │   ├── schema.ts                   # All Drizzle table definitions (all domains)
    │   └── seed.ts                     # Default equipment
    │
    ├── auth.ts                          # Auth.js config (Google provider, Drizzle adapter, scopes)
    ├── auth.config.ts                   # Edge-compatible auth config
    ├── middleware.ts                     # Auth.js middleware for protected routes
    │
    ├── app/
    │   ├── layout.tsx                  # Root layout (providers, nav)
    │   ├── page.tsx                    # Home → redirects to /log
    │   │
    │   ├── (auth)/                     # Auth pages (public)
    │   │   ├── login/page.tsx
    │   │   └── layout.tsx
    │   │
    │   ├── (app)/                      # Authenticated app pages
    │   │   ├── layout.tsx              # App shell, sidebar, nav
    │   │   ├── log/page.tsx            # Shot form (Sections 1-4)
    │   │   ├── history/page.tsx        # Shot log table
    │   │   ├── dashboard/page.tsx      # Stats & charts
    │   │   └── settings/
    │   │       ├── page.tsx            # General settings
    │   │       └── integrations/
    │   │           └── page.tsx        # Link/unlink Google Sheet
    │   │
    │   └── api/
    │       ├── auth/
    │       │   └── [...nextauth]/
    │       │       └── route.ts        # Auth.js catch-all handler
    │       ├── users/
    │       │   └── route.ts            # GET /api/users
    │       ├── beans/
    │       │   ├── route.ts            # GET/POST /api/beans
    │       │   └── [id]/route.ts
    │       ├── equipment/
    │       │   ├── grinders/
    │       │   │   └── route.ts        # GET/POST /api/equipment/grinders
    │       │   └── machines/
    │       │       └── route.ts        # GET/POST /api/equipment/machines
    │       ├── shots/
    │       │   ├── route.ts            # GET/POST /api/shots
    │       │   └── [id]/
    │       │       ├── route.ts        # GET/DELETE /api/shots/[id]
    │       │       └── reference/
    │       │           └── route.ts    # PATCH /api/shots/[id]/reference
    │       ├── stats/
    │       │   ├── overview/route.ts
    │       │   ├── by-bean/[beanId]/route.ts
    │       │   └── by-user/[userId]/route.ts
    │       └── integrations/
    │           ├── route.ts            # GET/POST /api/integrations (get/link sheet)
    │           ├── [id]/route.ts       # DELETE /api/integrations/[id] (unlink)
    │           └── validate/route.ts   # POST /api/integrations/validate (test sheet access)
    │
    └── components/
        ├── users/
        │   └── hooks.ts
        ├── beans/
        │   ├── hooks.ts
        │   └── BeanSelector.tsx
        ├── equipment/
        │   ├── hooks.ts
        │   ├── GrinderSelector.tsx
        │   └── MachineSelector.tsx
        ├── shots/
        │   ├── hooks.ts
        │   ├── form/
        │   │   ├── ShotForm.tsx
        │   │   ├── SectionBasics.tsx
        │   │   ├── SectionRecipe.tsx
        │   │   ├── SectionResults.tsx
        │   │   └── SectionFlavorWheel.tsx
        │   └── log/
        │       ├── ShotTable.tsx
        │       ├── ShotRow.tsx
        │       ├── ShotFilters.tsx
        │       └── ShotDetail.tsx
        ├── stats/
        │   ├── hooks.ts
        │   ├── StatCard.tsx
        │   ├── RatioChart.tsx
        │   ├── FlavorProfileChart.tsx
        │   └── BeanComparisonTable.tsx
        ├── integrations/
        │   ├── hooks.ts
        │   ├── LinkSheetForm.tsx       # Enter spreadsheet URL, validate, save
        │   └── IntegrationStatus.tsx   # Shows linked sheet status, unlink button
        ├── flavor-wheel/
        │   ├── FlavorWheel.tsx
        │   └── FlavorCategory.tsx
        ├── common/
        │   ├── Button.tsx
        │   ├── Input.tsx
        │   ├── Select.tsx
        │   ├── Modal.tsx
        │   ├── Toast.tsx
        │   ├── StarRating.tsx
        │   ├── CheckboxGroup.tsx
        │   └── RadioGroup.tsx
        └── layout/
            ├── AppShell.tsx
            ├── NavBar.tsx
            └── Sidebar.tsx
```

---

## Docker & docker-compose

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-coffee}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-coffee}
      POSTGRES_DB: ${DB_NAME:-coffee}
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-coffee}"]
      interval: 5s
      timeout: 3s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-coffee}:${DB_PASSWORD:-coffee}@db:5432/${DB_NAME:-coffee}
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    depends_on:
      db:
        condition: service_healthy

volumes:
  pg-data:
```

### Dockerfile (multi-stage)

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

Requires `output: "standalone"` in `next.config.ts` for the minimal production server.

### Dev workflow

```bash
# Start PostgreSQL only (develop Next.js locally with hot reload)
docker-compose up db -d
pnpm dev

# Or run everything in Docker
docker-compose up --build
```

---

## Database Schema (Drizzle ORM / PostgreSQL)

All table definitions in `src/db/schema.ts`.

**Tables:** `users`, `accounts`, `sessions` (Auth.js), `beans`, `grinders`, `machines`, `shots`, `integrations`

### Auth.js tables (managed by Drizzle adapter)
- `users` — `id` (uuid PK), `name`, `email`, `emailVerified`, `image`
- `accounts` — stores OAuth provider data (Google access/refresh tokens)
- `sessions` — active sessions
- `verification_tokens` — email verification (unused but required by adapter)

### `beans`
- `id` (uuid PK), `name` (text), `roastLevel` (text), `roastDate` (date), `createdBy` (uuid FK → users), `createdAt`

### `grinders` (equipment domain)
- `id` (uuid PK), `name` (text, unique), `createdAt`

### `machines` (equipment domain)
- `id` (uuid PK), `name` (text, unique), `createdAt`

### `shots` (core table)
- **Foreign keys:** `userId` → users, `beanId` → beans, `grinderId` → grinders, `machineId` → machines (optional)
- **Recipe:** `doseGrams` (numeric), `yieldGrams` (numeric), `grindSetting` (text), `brewTimeSecs` (int), `brewTempC` (numeric, nullable)
- **Computed (stored on write):** `brewRatio` (yield/dose), `flowRate` (yield/time), `daysPostRoast` (shot date - roast date)
- **Section 3 — Subjective:** `shotQuality` (int 1-5), `flavorProfile` (jsonb array), `textureBody` (text), `toolsUsed` (jsonb array), `notes` (text)
- **Section 4 — Flavor Wheel (all optional):** `flavorWheelCategories` (jsonb object), `flavorWheelBody` (text), `flavorWheelAdjectives` (jsonb array), `overallPreference` (int 1-5)
- **Meta:** `isReferenceShot` (boolean), `createdAt`, `updatedAt`

### `integrations`
- `id` (uuid PK), `userId` (uuid FK → users, unique), `provider` (text), `spreadsheetId` (text), `spreadsheetName` (text), `isActive` (boolean), `createdAt`, `updatedAt`

Note: Google OAuth tokens live in the Auth.js `accounts` table, not duplicated here. The integrations service reads the user's tokens from `accounts` when appending to Sheets.

---

## API Design

All endpoints under `/api`. Next.js App Router route handlers. Auth.js session required for all except `/api/auth/*`.

### Auth (Auth.js managed)
| Endpoint | Purpose |
|----------|---------|
| `/api/auth/[...nextauth]` | Auth.js catch-all (sign in, callback, sign out, session) |

### Users
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users` | List all users (from Auth.js users table) |

### Beans
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/beans` | List beans (with `?search=`) |
| POST | `/api/beans` | Create a bean |

### Equipment
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/equipment/grinders` | List grinders |
| POST | `/api/equipment/grinders` | Create a grinder |
| GET | `/api/equipment/machines` | List espresso machines |
| POST | `/api/equipment/machines` | Create a machine |

### Shots
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/shots` | List shots (`?userId`, `?beanId`, `?sort`, `?order`, `?limit`, `?offset`) |
| GET | `/api/shots/[id]` | Get shot with joined user/bean/equipment names |
| POST | `/api/shots` | Create shot (computes fields, appends to linked Google Sheet) |
| PATCH | `/api/shots/[id]/reference` | Toggle isReferenceShot |
| DELETE | `/api/shots/[id]` | Delete a shot |

### Stats
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/stats/overview` | Aggregate stats for dashboard |
| GET | `/api/stats/by-bean/[beanId]` | Per-bean stats |
| GET | `/api/stats/by-user/[userId]` | Per-user stats |

### Integrations
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/integrations` | Get current user's integration (linked sheet info) |
| POST | `/api/integrations` | Link a Google Sheet (validates access, writes header row) |
| DELETE | `/api/integrations/[id]` | Unlink a Google Sheet |
| POST | `/api/integrations/validate` | Test if a spreadsheet ID is accessible with user's token |

---

## Tasks

### Phase 1: Foundation — Next.js + Auth + DB + Basic Form + Table

- [x] **1.1** Initialize Next.js 15 project with pnpm: `package.json`, `tsconfig.json`, `next.config.ts` (with `output: "standalone"`), `tailwind.config.ts`, `postcss.config.js`, `.gitignore`. Install deps: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `drizzle-orm`, `postgres`, `drizzle-kit`, `next-auth@5`, `@auth/drizzle-adapter`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/react-table`.
- [x] **1.2** Create Docker and environment files: `Dockerfile` (multi-stage as spec'd), `docker-compose.yml` (PostgreSQL 16 + app services), `.dockerignore`, `.env.example` with `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- [x] **1.3** Create Drizzle config and full database schema: `drizzle.config.ts` pointing to `src/db/schema.ts`. Define all tables in `src/db/schema.ts` — Auth.js tables (`users`, `accounts`, `sessions`, `verificationTokens`), `beans`, `grinders`, `machines`, `shots` (all recipe/subjective/flavor-wheel/computed/meta columns per spec), `integrations`. Create `src/db/index.ts` with postgres.js client and Drizzle instance. Generate initial migration to `drizzle/migrations/`.
- [x] **1.4** Create shared Zod schemas and constants by domain in `src/shared/`: `beans/schema.ts` + `beans/constants.ts` (roast levels), `equipment/schema.ts` + `equipment/constants.ts` (tool options), `shots/schema.ts` (creation input + response) + `shots/constants.ts` (flavor profiles, textures), `users/schema.ts`, `integrations/schema.ts`, `flavor-wheel/constants.ts` (full SCA wheel hierarchy, body adjectives, extra adjectives), and `src/shared/index.ts` barrel export.
- [x] **1.5** Configure Auth.js v5 with Google provider: `src/auth.ts` (Drizzle adapter, Google provider with `spreadsheets` scope, callbacks for session userId), `src/auth.config.ts` (edge-compatible), `src/middleware.ts` (protect all routes except `/login` and `/api/auth`), `src/app/api/auth/[...nextauth]/route.ts` catch-all handler.
- [x] **1.6** Create centralized route definitions in `src/app/routes.ts` with all app routes and API routes plus `resolvePath` helper.
- [x] **1.7** Build root layout and app shell: `src/app/layout.tsx` (TanStack Query provider, session provider, global styles), `src/app/page.tsx` (redirect to `/log`), `src/app/(auth)/layout.tsx` + `login/page.tsx` (Google sign-in button), `src/app/(app)/layout.tsx` (authenticated shell with nav), `src/components/layout/AppShell.tsx`, `NavBar.tsx`. Build common UI primitives: `Button`, `Input`, `Select`, `StarRating`, `CheckboxGroup`, `RadioGroup` in `src/components/common/`.
- [x] **1.8** Build API routes for users, beans, and equipment: `src/app/api/users/route.ts` (GET), `src/app/api/beans/route.ts` (GET with `?search=`, POST), `src/app/api/equipment/grinders/route.ts` (GET/POST), `src/app/api/equipment/machines/route.ts` (GET/POST). Each validates with Zod, requires auth session. Create TanStack Query hooks in `src/components/{beans,equipment,users}/hooks.ts`.
- [x] **1.9** Build shot log form (Sections 1-3) and shot creation API: `src/app/api/shots/route.ts` (GET with query params; POST that computes `brewRatio`, `flowRate`, `daysPostRoast`). Build `src/app/(app)/log/page.tsx` with `ShotForm.tsx`, `SectionBasics.tsx` (user/bean/grinder/machine selectors with inline create), `SectionRecipe.tsx` (dose, yield, grind, time, temp), `SectionResults.tsx` (quality stars, flavor profile, texture, tools, notes). Wire React Hook Form + Zod. Create `BeanSelector.tsx`, `GrinderSelector.tsx`, `MachineSelector.tsx`.
- [x] **1.10** Build shot history page and seed script: `src/app/(app)/history/page.tsx` with `ShotTable.tsx` using @tanstack/react-table, `ShotRow.tsx`. Create `src/app/api/shots/[id]/route.ts` (GET with joins, DELETE). Create `src/db/seed.ts` for default equipment. **Milestone: sign in -> fill form -> submit -> see shot in history table.**

### Phase 2: Integrations + Full Form + Shot Log Polish

- [x] **2.1** Build Google Sheets integration backend: `src/lib/google-sheets.ts` with functions to validate spreadsheet access, write header row, append shot row, and refresh expired OAuth tokens from Auth.js `accounts` table (mark integration `isActive: false` on refresh failure).
- [x] **2.2** Build integrations API routes: `src/app/api/integrations/route.ts` (GET current user's integration, POST to link sheet — validates, writes header, saves), `[id]/route.ts` (DELETE to unlink), `validate/route.ts` (POST to test access). Create `src/components/integrations/hooks.ts`.
- [x] **2.3** Build Settings pages: `src/app/(app)/settings/page.tsx`, `settings/integrations/page.tsx` with `LinkSheetForm.tsx` (spreadsheet URL input, validate, link) and `IntegrationStatus.tsx` (linked sheet info, unlink button).
- [x] **2.4** Wire Sheets append into shot creation: update `POST /api/shots` to check user integration, if active call `appendShotRow()` fire-and-forget (non-blocking, log errors).
- [x] **2.5** Build Section 4 (Flavor Wheel): `SectionFlavorWheel.tsx` as collapsible accordion with nested checkboxes for SCA categories, body/texture radios, additional adjectives, overall preference stars. Create `FlavorWheel.tsx` and `FlavorCategory.tsx` in `src/components/flavor-wheel/`. Update `ShotForm.tsx` to include Section 4.
- [x] **2.6** Enhance shot log: add sortable column headers via @tanstack/react-table sorting, add `ShotFilters.tsx` (filter by user, bean, date range), wire filters to `GET /api/shots` query params.
- [x] **2.7** Add reference shot toggling: `src/app/api/shots/[id]/reference/route.ts` (PATCH toggle `isReferenceShot`), star toggle in `ShotRow.tsx`, gold/green border CSS for reference rows.
- [x] **2.8** Build shot detail modal: `ShotDetail.tsx` (modal with all fields including flavor wheel), `Modal.tsx` common component. Click row to open.
- [x] **2.9** Form pre-population: on form mount, query current user's most recent shot and set grinder, machine, dose, grind setting as React Hook Form defaults.

### Phase 3: Dashboard + PWA

- [x] **3.1** Build stats API routes: `overview/route.ts` (total shots, avg quality, avg ratio, most-used bean, shots this week), `by-bean/[beanId]/route.ts`, `by-user/[userId]/route.ts`. Create `src/components/stats/hooks.ts`.
- [x] **3.2** Install `recharts`. Build dashboard page: `src/app/(app)/dashboard/page.tsx` with `StatCard.tsx` (total shots, avg quality, avg brew ratio, most-used bean, shots this week).
- [x] **3.3** Build dashboard charts: `RatioChart.tsx` (brew ratio trend, Recharts line chart), `FlavorProfileChart.tsx` (flavor frequency, Recharts bar chart).
- [x] **3.4** Build bean comparison view: `BeanComparisonTable.tsx` (compare beans by avg quality, avg ratio, shot count, common flavors). Add as collapsible section on dashboard.
- [x] **3.5** Configure PWA: `public/manifest.json`, app icons, `<link rel="manifest">` in layout, service worker for static asset caching.
- [x] **3.6** Responsive design audit: single-column form at 375px, card layout for shot log below 768px, stacked charts on mobile, collapsed nav on mobile.

### Phase 4: Polish + Deploy to Railway

- [x] **4.1** Add loading and empty states: skeleton loaders for shot table, dashboard, and form selectors. Empty state messages for "No shots yet", "No beans yet", "No integration linked". `<Suspense>` boundaries.
- [x] **4.2** Add error boundaries and toast notifications: `Toast.tsx` notification system (success/error/warning). React error boundaries around major sections.
- [x] **4.3** Data export: CSV export button on history page (client-side CSV generation from shot data, matching Google Sheets row format).
- [x] **4.4** Add `Sidebar.tsx` for desktop nav. Final UI consistency pass: common components, spacing/typography, Tailwind dark-mode-ready classes.
- [x] **4.5** Deploy to Railway: managed Postgres, env vars, deploy from Dockerfile, run Drizzle migrations, verify auth + shots + Sheets sync in production.
- [x] **4.6** Generate QR code linking to deployed Railway URL. Add to settings page for espresso station access.

---

## Additional Tasks

- [x] Schema update: beans — add origin, roaster, processing method (all optional). Shots — replace grind_setting with grind_level (numeric), brew_time_secs as float, remove brew_ratio & days_post_roast from DB (computed on read), replace texture_body with flavor_wheel_body, overall_preference as float, add pre_infusion_duration (float). Regenerated migration.
- [x] Shot Quality changed from 1-5 star rating to 1-10 scale with slider. Created `Slider` common component, updated `SectionResults` form, `ShotTable` display, and Zod schema.
- [x] Slider thumb replaced with espresso cup SVG icon. Cup icon saved to `public/icons/espresso-cup-thumb.svg` and inlined as CSS data URI in `globals.css`.
- [x] Added "Clear section" buttons to each form section (Setup, Recipe, Results & Tasting, Flavor Wheel) in the shot log form.
- [x] Beans: All details optional except name and roast level
- [x] Shot log: Pre-populate from last shot; clear buttons per section
- [x] Yield ratio UI element (enter ratio like 2 or 3, auto-calculates yield from dose)
- [x] Brew Temp °F input with auto-conversion to °C
- [x] Recipe section: stacked vertical layout with ratio quick-select buttons (1:1–1:4) on Yield, °F default with persisted localStorage preference
- [x] Simplified Results & Tasting section: removed duplicate Body radio group (already in Flavor Wheel section), removed unused imports
- [x] Removed flavorProfile (simple checkboxes) in favor of SCA Flavor Wheel only. Removed overallPreference (duplicate of shotQuality). Dropped both DB columns, deleted `shots/constants.ts`, updated all API routes, stats, charts, detail views, Google Sheets row format, and hooks.
- [x] Moved "Tools Used" from Results & Tasting section into the Recipe section
- [x] Moved "Tools Used" into the Setup section, stacked vertically with Bean, Grinder, Machine
- [x] Created `tools` database table (slug, name, description) in equipment domain. Shots now store tool slugs instead of hardcoded enum names. Added `ToolSelector` component with tooltips and inline "New" creation. API route at `/api/equipment/tools`. Seed script prepopulates 8 default tools. ShotDetail and Google Sheets resolve slugs to display names.
- [x] Mobile-friendly number inputs: Created `NumberStepper` common component with large 56px tap-target buttons in horizontal `[−] value [+]` layout. Replaced all plain number inputs in SectionRecipe (Dose, Yield, Grind Level, Brew Time, Brew Temp, Pre-infusion) with NumberStepper. Value is tappable for direct keyboard entry. Supports suffix labels (g, sec, °F/°C), configurable step/min/max, and integrates with react-hook-form via Controller.
- [x] Brew Time allows fractional seconds: Updated NumberStepper step from 1 to 0.01 to support fractional seconds (e.g., 29.52). Schema already supports decimals via z.coerce.number().
- [x] Add quick select buttons for "Dose" in Recipe section: Added quick-select buttons (16g, 18g, 20g, 22g) to the Dose field, matching the pattern used for Yield ratio buttons. Buttons highlight when active, and manual edits deselect if the value doesn't match a quick-select option. When a dose is selected and a ratio is active, yield is automatically recalculated.

---

## Key Frontend UX Decisions

- **Form layout:** Single scrollable page with section headers. Section 4 collapsed by default with "Describe flavors in detail?" expander.
- **Bean selector:** Combobox with autocomplete. "Create new" inline if no match.
- **Equipment selectors:** Dropdowns for grinder and machine, each with "Add new" option.
- **Shot log:** Horizontally scrollable table on desktop. Reference shots get gold/green border + star toggle. Card layout on mobile (<768px).
- **Integrations settings:** Simple page showing linked sheet status (name, link) with "Link Sheet" / "Unlink" actions.

---

## Mobile Strategy

**PWA first.** Installable on home screen, full-screen, works offline for static assets. QR code at the espresso station links to the app.

**React Native later only if needed.** `src/shared/` reusable as-is, API routes stay unchanged, add a `mobile/` project calling the same `/api/*` endpoints.

---

## Verification

1. **Dev workflow:** `docker-compose up db -d` then `pnpm dev` — app on `:3000`, Postgres on `:5432`
2. **Docker:** `docker-compose up --build` → full stack on `:3000`
3. **Auth:** Click "Sign in with Google" → OAuth consent (includes Sheets scope) → redirected to app → session active
4. **Link Sheet:** Settings → Integrations → paste spreadsheet URL → validates → header row written to sheet
5. **Form submission:** Fill all 4 sections → submit → shot in history table → row appended to linked Google Sheet
6. **Computed fields:** dose=18, yield=36, time=30, bean roasted 10 days ago → brewRatio=2.0, flowRate=1.2, daysPostRoast=10
7. **Reference shot:** Toggle → highlight in table → persisted on reload
8. **Filters/sort:** Filter by user and bean → correct subset. Sort by quality desc → correct order.
9. **Validation:** Submit with missing required fields → inline errors + API returns 400
10. **Mobile:** 375px viewport → form usable, shot log shows cards
11. **Railway:** Deploy → app loads → Postgres persists → Sheets sync works
