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

## Implementation Phases

### Phase 1: Foundation — Next.js + Auth + DB + Basic Form + Table
1. Initialize Next.js 15 project with TypeScript, Tailwind, App Router
2. Set up Docker + docker-compose (PostgreSQL + Next.js)
3. Configure Auth.js v5 with Google provider (request `spreadsheets` scope)
4. Set up Drizzle ORM: schema (`src/db/schema.ts`), connection, initial migration
5. Build `src/shared/`: Zod schemas and constants organized by domain
6. Build API routes: users, beans, equipment, shots (CRUD + computed fields)
7. Build pages: login, log shot (Sections 1-3), history table
8. Seed script for default equipment
9. **Milestone:** Sign in with Google → fill form → submit → see shot in table

### Phase 2: Integrations + Full Form + Shot Log Polish
1. **Integrations domain:**
   - Settings → Integrations page: enter spreadsheet URL, validate, link
   - `POST /api/integrations` validates sheet access, writes header row, saves
   - `shots/route.ts` POST handler appends row to linked sheet (fire-and-forget)
   - Token refresh logic using refresh token from Auth.js `accounts` table
2. Section 4 (Flavor Wheel): collapsible accordion with nested checkboxes, body/texture single-select, additional adjectives, overall preference
3. Enhanced shot log: sortable columns (@tanstack/react-table), filter bar, reference shot toggling + highlighting, shot detail modal
4. Form convenience: pre-populate grinder/machine/dose/grind from user's last shot

### Phase 3: Dashboard + PWA
1. Dashboard: stat cards, brew ratio trend chart (Recharts), flavor profile frequency chart, bean comparison view
2. PWA: manifest.json, next-pwa or manual service worker, "Add to Home Screen"
3. Responsive design audit on mobile viewports

### Phase 4: Polish + Deploy to Railway
1. Loading states, error boundaries, empty states, toast notifications
2. Data export to CSV
3. **Railway deployment:**
   - Railway Postgres plugin (managed) or deploy from docker-compose
   - `DATABASE_URL` from Railway's Postgres, other env vars in dashboard
   - Builds from Dockerfile with `output: "standalone"`
4. Generate QR code linking to deployed app

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
