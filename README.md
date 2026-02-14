# Coffee Brewing Tracker

A web application for tracking espresso shot recipes, tasting notes, and analysis metrics. Designed for 1-15 people sharing an espresso setup, with optional Google Sheets integration to mirror the original Google Forms + Sheets workflow.

## Features

- **Shot Tracking**: Record detailed shot recipes including dose, yield, grind settings, brew time, temperature, and pressure
- **Tasting Notes**: Subjective quality ratings (1-5 scale with 0.5 steps), flavor profiles, and optional SCA Flavor Wheel analysis
- **Shot History**: Sortable, filterable table of all shots with reference shot highlighting
- **Dashboard**: Statistics, charts, and bean comparison views
- **Google Sheets Integration**: Automatically append shot data to a user-configured Google Spreadsheet
- **PWA Support**: Installable progressive web app for easy access at the espresso station

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Authentication**: Auth.js v5 (next-auth) with Google OAuth
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Deployment**: Railway (Docker + docker-compose)

## Getting Started

### Environment Variables

Create a `.env` file in the project root and copy the following:

```env
# ── Required Variables ──────────────────────────────────────────────────

# PostgreSQL connection string
# If you use the included `docker-compose up db -d`, Postgres is exposed on port 8788.
# If you run Postgres directly on your machine, use whatever port you configured (often 5432).
DATABASE_URL=postgresql://coffee:coffee@localhost:8788/coffee

# Application URL (defaults to http://localhost:3000; Railway may omit protocol, auto-prefixed in production)
NEXTAUTH_URL=http://localhost:8787

# Random secret for session encryption (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-here

# Google OAuth 2.0 client ID (from Google Cloud Console)
# Not needed if ENABLE_DEV_USER=true
# Go to https://console.cloud.google.com/apis/credentials to create a new client ID.
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── Optional Variables ──────────────────────────────────────────────────

# Database configuration (used by docker-compose.yml)
# Defaults shown below if not set
DB_USER=coffee
DB_PASSWORD=coffee
DB_NAME=coffee

# Port to run the application on. Will use the NEXTAUTH_URL port if not set if possible. Otherwise, defaults to 3000.
PORT=

# Set to "true" to bypass Google OAuth with a local dev user (useful for local development)
# When enabled, you do not need GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET
ENABLE_DEV_USER=true

# Set to "true" to enable server debugging output in the frontend
ENABLE_DEBUGGING=

# Trust host header behind reverse proxy (auto-detected on Railway/Vercel)
# Set to "true" when running behind a reverse proxy
# NEXTAUTH_TRUST_HOST is also accepted as an alias
AUTH_TRUST_HOST=

# ── Logging Configuration ──────────────────────────────────────────────────

# Log level: "error" | "warn" | "info" | "debug"
# Defaults to "info" in production, "debug" in development
# This sets the root/default log level for all loggers
LOG_LEVEL=

# Python-style logging configuration (JSON format)
# Allows setting different log levels for different modules/contexts
# Example: LOG_CONFIG='{"root":"info","auth":"debug","auth.middleware":"warn","api":"error"}'
# - "root": Sets the default log level (overrides LOG_LEVEL if set)
# - Module paths use dot notation (e.g., "auth.middleware" for nested contexts)
# - Falls back to root level if no module-specific level is set
# Server-side: LOG_CONFIG
# Client-side: NEXT_PUBLIC_LOG_CONFIG
LOG_CONFIG=

# Set to "false" to disable filtering of unwanted log messages (e.g., AppIntegration messages)
# Defaults to "true" (filtering enabled)
# Server-side: LOG_FILTERING_ENABLED
# Client-side: NEXT_PUBLIC_LOG_FILTERING_ENABLED
LOG_FILTERING_ENABLED=
```

### Google OAuth Setup

To enable Google OAuth authentication, you need to create OAuth 2.0 credentials in Google Cloud Console. See [docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md) for detailed step-by-step instructions.

**Quick start**: For local development, you can skip OAuth setup by setting `ENABLE_DEV_USER=true` in your `.env` file. This bypasses authentication and uses a local dev user.

### Development Setup

1. **Start PostgreSQL**:
   ```bash
   docker-compose up db -d
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run database migrations**:
   ```bash
   pnpm db:migrate
   ```

4. **Seed default equipment** (optional):
   ```bash
   pnpm db:seed
   ```

5. **Start development server**:
   ```bash
   pnpm dev
   ```

The app will be available at `http://localhost:8787`.

### Docker Setup

To run everything in Docker:

```bash
docker-compose up --build
```

## Deployment

The project is configured for deployment on Railway. See `docs/RAILWAY.md` for deployment-specific notes.

## License

Private project.
