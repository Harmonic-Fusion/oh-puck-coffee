# Coffee Brewing Tracker

A web application for tracking espresso shot recipes, tasting notes, and analysis metrics. Designed for 1-15 people sharing an espresso setup, with optional Google Sheets integration to mirror the original Google Forms + Sheets workflow.

## Features

- **Shot Tracking**: Record detailed shot recipes including dose, yield, grind settings, brew time, temperature, and pressure
- **Tasting Notes**: Subjective quality ratings (1-10 scale), flavor profiles, and optional SCA Flavor Wheel analysis
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

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Docker and docker-compose (for PostgreSQL)
- Google OAuth credentials (for authentication and Sheets integration)

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://coffee:coffee@localhost:5432/coffee
NEXTAUTH_URL=http://localhost:8787
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

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

## Project Structure

The project follows a domain-organized structure:

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # React components organized by domain
├── db/              # Database schema and migrations
├── lib/             # Utility functions (Google Sheets, CSV export)
├── shared/          # Shared Zod schemas and constants
└── auth.ts          # Auth.js configuration
```

### Domains

- **users**: User management and authentication
- **beans**: Coffee bean tracking
- **equipment**: Grinders, machines, and tools
- **shots**: Shot recipes and tasting notes
- **stats**: Analytics and dashboard data
- **integrations**: Google Sheets integration

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

### Code Style

See `.contextual/context/guidelines.md` for detailed coding guidelines, including:

- Import statement conventions
- Function declaration patterns
- Error handling with `unknown` types
- React hooks best practices
- Component extraction thresholds

### Routes

Always use routes from `@/app/routes` instead of hardcoded paths:

```tsx
import { routes, resolvePath } from '@/app/routes'
<Link href={routes.log.path}>Log Shot</Link>
```

## Google Sheets Integration

Users can link their Google Spreadsheet to automatically sync shot data:

1. Sign in with Google OAuth (includes Sheets scope)
2. Navigate to Settings → Integrations
3. Enter your Google Spreadsheet URL/ID
4. The app validates access and writes a header row
5. Every new shot automatically appends a row to your sheet

The integration is **append-only** — no updates or deletes are sent to the spreadsheet.

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

## Deployment

The project is configured for deployment on Railway. See `RAILWAY.md` for deployment-specific notes.

## Documentation

- **Specifications**: See `specs/letsgo/context.md` for detailed implementation plan
- **Contextual Guidelines**: See `.contextual/context/guidelines.md` for coding standards
- **Configuration**: See `.contextual/config.yaml` for project configuration

## License

Private project.
