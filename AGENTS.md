# Agent Guide

Essential information for AI agents working on the Coffee Brewing Tracker codebase.

## Project Overview

See @`README.md` for project overview, features, and tech stack.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated app routes
│   ├── (auth)/            # Auth routes (login)
│   ├── api/               # API route handlers
│   ├── routes.ts          # ⚠️ Centralized route definitions — ALWAYS use this
│   └── providers.tsx      # React Query provider
├── components/            # React components organized by domain
│   ├── beans/            # Bean-related components
│   ├── equipment/        # Grinders, machines, tools
│   ├── shots/            # Shot forms and display
│   ├── stats/            # Dashboard charts and stats
│   └── common/           # Reusable UI components
├── db/                   # Database
│   ├── schema.ts         # Drizzle schema definitions
│   ├── index.ts          # Database connection
│   └── seed.ts           # Seed script
├── lib/                  # Utility functions
│   ├── api-auth.ts       # API authentication helpers
│   ├── google-sheets.ts  # Google Sheets integration
│   └── csv-export.ts      # CSV export functionality
├── shared/               # Shared schemas and constants
│   ├── config.ts         # ⚠️ Environment config — ALL env vars here
│   └── [domain]/          # Domain-specific schemas (beans, shots, etc.)
├── auth.ts               # Auth.js configuration
└── middleware.ts         # Next.js middleware
```

## Critical Conventions

### Environment Variables

**ALWAYS** use centralized `config` from `@/shared/config.ts`. Never read `process.env` directly in application code.

```ts
// ✅ Correct
import { config } from "@/shared/config"
const dbUrl = config.databaseUrl

// ❌ Wrong
const dbUrl = process.env.DATABASE_URL
```

For standalone scripts (`drizzle.config.ts`, `seed.ts`), use a local `CONFIG` object at the top. See @`.contextual/context/guidelines.md` for the CONFIG pattern.

### Routes

**ALWAYS** use routes from `@/app/routes` instead of hardcoded paths.

```tsx
// ✅ Correct
import { AppRoutes, ApiRoutes, resolvePath } from "@/app/routes"
<Link href={AppRoutes.log.path}>Log Shot</Link>
const url = resolvePath(ApiRoutes.shot.path, { id: shotId })

// ❌ Wrong
<Link href="/log">Log Shot</Link>
const url = `/api/shots/${shotId}`
```

### Data Fetching

Uses **TanStack Query** directly (not a custom `useApiQuery` hook):

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ApiRoutes } from "@/app/routes"

export function useShots() {
  return useQuery({
    queryKey: ["shots"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.shots.path)
      if (!res.ok) throw new Error("Failed to fetch shots")
      return res.json()
    },
  })
}
```

**Patterns:** Use `queryKey` arrays for cache keys, always use `ApiRoutes` for URLs, handle errors in `queryFn`, use `useQueryClient` for cache invalidation in mutations.

### Never Do These

See @`.contextual/context/guidelines.md` for the complete list of critical rules that must never be violated, including:
- Never read `process.env` directly (use `@/shared/config`)
- Never hardcode routes (use `@/app/routes`)
- Never use `any` type (use `unknown` and narrow)
- Never skip authentication or validation
- Never commit a migration without idempotent guards (`IF NOT EXISTS`, `IF EXISTS`, `DO $$ BEGIN ... END $$`)

### Code Style

See @`.contextual/context/guidelines.md` for:
- Import statements (type imports, Zod exception)
- Function declarations (prefer function declarations over arrow functions)
- Error handling (use `unknown`, narrow with `instanceof Error`)
- React hooks (avoid `useEffect`, prefer render-time computation)
- Component extraction (thresholds: 30 lines for conditionals, 40 lines for any JSX block)
- **Type Safety** - TypeScript best practices
- **Validation** - Input validation requirements
- **Error Handling** - Error handling patterns
- **File Naming** - File naming conventions
- **Common Mistakes** - Frequent errors to avoid

## Domain Organization

Code organized by domain (see @`README.md` for domain descriptions):
- **beans**: `src/components/beans/`, `src/shared/beans/`
- **equipment**: `src/components/equipment/`, `src/shared/equipment/`
- **shots**: `src/components/shots/`, `src/shared/shots/`
- **stats**: `src/components/stats/`, `src/app/api/stats/`
- **integrations**: `src/components/integrations/`, `src/lib/google-sheets.ts`
- **users**: `src/components/users/`, `src/shared/users/`

Each domain typically has: components, Zod schemas (`src/shared/[domain]/schema.ts`), API routes (`src/app/api/[domain]/`), hooks (`src/components/[domain]/hooks.ts`).

## Database

**ORM**: Drizzle ORM with PostgreSQL  
**Schema**: `src/db/schema.ts`

```bash
pnpm db:generate  # Generate migration after schema changes
pnpm db:migrate   # Apply migrations
pnpm db:seed      # Seed default equipment
```

## Development Workflow

### Database Migrations

Generate a new migration after schema changes:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

### ⚠️ Migrations MUST Be Idempotent

**Every migration file MUST be safe to run against a database where the changes already exist.** After `pnpm db:generate`, always edit the generated SQL to add idempotent guards before committing.

**Required patterns:**

```sql
-- Tables: always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "my_table" ( ... );

-- Columns: always use IF NOT EXISTS
ALTER TABLE "my_table" ADD COLUMN IF NOT EXISTS "my_column" text;

-- Renaming columns: wrap in a DO block that checks first
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'my_table' AND column_name = 'old_name'
  ) THEN
    ALTER TABLE "my_table" RENAME COLUMN "old_name" TO "new_name";
  END IF;
END $$;

-- Foreign keys: wrap in a DO block that checks first
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'my_fk_name') THEN
    ALTER TABLE "my_table" ADD CONSTRAINT "my_fk_name" FOREIGN KEY ("col") REFERENCES "other"("id");
  END IF;
END $$;

-- Dropping constraints: use IF EXISTS
ALTER TABLE "my_table" DROP CONSTRAINT IF EXISTS "old_constraint";
```

**Why:** We run migrations both via `drizzle-kit migrate` and a programmatic `scripts/migrate.ts` startup script. These use separate tracker tables (`drizzle.__drizzle_migrations` vs `public.__drizzle_migrations`). Idempotent SQL ensures migrations never fail regardless of which tracker recorded them.

## Authentication

**Provider**: Auth.js v5 (next-auth) with Google OAuth  
**Session**: Use `getSession()` from `@/auth.ts` in API routes (includes dev user fallback)  
**Dev Mode**: Set `ENABLE_DEV_USER=true` to bypass OAuth  
**Middleware**: `src/middleware.ts` handles route protection

## API Routes

All API routes require authentication (except `/api/auth/*`), use `getSession()` from `@/auth.ts`, return JSON, and use Zod schemas for validation.

```ts
import { getSession } from "@/auth"
import { db } from "@/db"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json(data)
}
```

## API Endpoints

All endpoints require authentication (except `/api/auth/*`):

- `GET /api/users` - List all users
- `GET /api/beans` - List beans (with search)
- `POST /api/beans` - Create a bean
- `GET /api/equipment/grinders` - List grinders
- `GET /api/equipment/machines` - List machines
- `GET /api/equipment/tools` - List tools
- `GET /api/shots` - List shots (with filters)
- `POST /api/shots` - Create a shot
- `GET /api/shots/[id]` - Get shot details
- `PATCH /api/shots/[id]/reference` - Toggle reference shot
- `DELETE /api/shots/[id]` - Delete a shot
- `GET /api/stats/overview` - Dashboard statistics
- `GET /api/integrations` - Get user's integration
- `POST /api/integrations` - Link a Google Sheet

## Common Tasks

### Adding a New API Endpoint

1. Add route to `src/app/routes.ts`
2. Create route handler in `src/app/api/[endpoint]/route.ts`
3. Add hook in `src/components/[domain]/hooks.ts` if needed

### Adding a New Component

1. Create in `src/components/[domain]/ComponentName.tsx`
2. Use function declaration (see @`.contextual/context/guidelines.md`)
3. Extract if over 40 lines (see @`.contextual/context/guidelines.md`)
4. Use `AppRoutes` for navigation links

### Modifying Database Schema

1. Update `src/db/schema.ts`
2. `pnpm db:generate`
3. **Edit the generated migration SQL to add idempotent guards** (see "Migrations MUST Be Idempotent" above)
4. Review migration in `drizzle/migrations/`
5. `pnpm db:migrate`

## Important Files

- @`.contextual/context/guidelines.md` - Full coding guidelines
- `src/shared/config.ts` - Environment variable access
- `src/app/routes.ts` - Route definitions
- `src/db/schema.ts` - Database schema
- `src/auth.ts` - Authentication configuration
- @`README.md` - Project overview and setup

## Development

See @`README.md` for:
- Environment variable setup
- Development setup steps
- Deployment information
