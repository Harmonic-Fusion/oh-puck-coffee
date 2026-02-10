# Railway Deployment Guide

This guide covers deploying the Coffee Tracker app to Railway.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. Railway CLI installed (optional): `npm i -g @railway/cli`
3. Google OAuth credentials (Client ID and Secret)

## Deployment Steps

### 1. Create a New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (recommended) or "Empty Project"

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. Note the connection details (available in the service's "Variables" tab)

### 3. Deploy the Application

#### Option A: Deploy from GitHub (Recommended)

1. Connect your GitHub repository to Railway
2. Railway will detect the `Dockerfile` and deploy automatically
3. The build process will:
   - Build the Next.js app
   - Run database migrations (via `postbuild` script)
   - Start the application

#### Option B: Deploy via Railway CLI

```bash
railway login
railway init
railway up
```

### 4. Configure Environment Variables

In Railway, go to your service → Variables tab and add:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (auto-provided if using Railway Postgres)
- `NEXTAUTH_URL` - Your Railway app URL (e.g., `https://your-app.railway.app`)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

**Optional:**
- `PORT` - Defaults to 3000 (Railway sets this automatically)
- `NODE_ENV` - Set to `production`

### 5. Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-app.railway.app/api/auth/callback/google`
5. Save changes

### 6. Verify Deployment

1. Visit your Railway app URL
2. Sign in with Google OAuth
3. Create a test shot
4. Verify Google Sheets sync (if configured)

## Database Migrations

Migrations run automatically after each build via the `postbuild` script. If you need to run migrations manually:

```bash
railway run pnpm db:migrate
```

Or via Railway dashboard:
1. Go to your service
2. Click "Deployments" → "View Logs"
3. Check for migration output

## Troubleshooting

### Build Fails

- Check Railway build logs
- Ensure `DATABASE_URL` is set correctly
- Verify all dependencies are in `package.json`

### Database Connection Issues

- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check Railway Postgres service is running
- Ensure migrations completed successfully

### OAuth Not Working

- Verify `NEXTAUTH_URL` matches your Railway domain
- Check Google OAuth redirect URI is correct
- Ensure `NEXTAUTH_SECRET` is set

### Migrations Not Running

- Check `postbuild` script in `package.json`
- Verify `scripts/migrate.ts` exists
- Check Railway build logs for migration output

## Custom Domain

1. In Railway project, go to "Settings" → "Domains"
2. Add your custom domain
3. Update `NEXTAUTH_URL` environment variable
4. Update Google OAuth redirect URI

## Monitoring

- View logs: Railway Dashboard → Service → "View Logs"
- Metrics: Railway Dashboard → Service → "Metrics"
- Database: Railway Dashboard → Postgres Service → "Data"

## Cost Optimization

- Railway offers a free tier with $5 credit/month
- Postgres: ~$5/month for starter plan
- App hosting: Pay-as-you-go (very affordable for low traffic)
- Consider using Railway's sleep feature for dev environments
