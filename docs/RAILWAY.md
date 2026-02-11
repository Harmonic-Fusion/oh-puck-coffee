# Railway Deployment Guide

This guide covers deploying the Coffee Tracker app to Railway.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. Railway CLI installed (optional): `npm i -g @railway/cli`
3. Google OAuth credentials (Client ID and Secret)

## Google OAuth Client Setup

Follow these steps to create and configure a Google OAuth client for authentication:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Coffee Tracker")
5. Click "Create"
6. Wait for the project to be created, then select it from the dropdown

### 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" or "Google Identity Services API"
4. Click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Coffee Tracker (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
   - Add: `email`, `profile`, `openid`
   - Click "Update" → "Save and Continue"
7. On the "Test users" page (if in testing mode), add your email address
8. Click "Save and Continue" → "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ Create Credentials" → "OAuth client ID"
3. Select application type: "Web application"
4. Enter a name (e.g., "Coffee Tracker Web Client")
5. Add authorized JavaScript origins:
   - For local development: `http://localhost:3000`
   - For Railway: `https://your-app.railway.app` (update after deployment)
6. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For Railway: `https://your-app.railway.app/api/auth/callback/google` (update after deployment)
7. Click "Create"
8. **Important**: Copy and save both:
   - **Client ID** (you'll need this for `GOOGLE_CLIENT_ID`)
   - **Client Secret** (you'll need this for `GOOGLE_CLIENT_SECRET`)
   - ⚠️ The secret is only shown once! Save it securely.

### 5. Update Credentials After Deployment

After deploying to Railway and getting your app URL:

1. Go back to "APIs & Services" → "Credentials"
2. Click on your OAuth 2.0 Client ID
3. Add your Railway domain to:
   - Authorized JavaScript origins: `https://your-app.railway.app`
   - Authorized redirect URIs: `https://your-app.railway.app/api/auth/callback/google`
4. Click "Save"

### 6. Add Authorized Domain (Required - Fixes "Access blocked" Error)

**This step is critical!** Without it, you'll see "Access blocked: [domain] has not completed the Google verification process".

1. Go to "APIs & Services" → "OAuth consent screen"
2. Scroll down to the "Authorized domains" section
3. Click "+ ADD DOMAIN"
4. Enter your Railway domain (e.g., `oh-puck-coffee-production.up.railway.app`)
   - **Important**: Only enter the domain name, NOT the full URL
   - Do NOT include `https://` or any paths
   - Example: `oh-puck-coffee-production.up.railway.app` ✅
   - Wrong: `https://oh-puck-coffee-production.up.railway.app` ❌
5. Click "ADD"
6. Google may require verification:
   - For Railway domains, verification is usually automatic
   - If verification is required, follow the prompts in the Google Cloud Console
   - Check the verification status in the OAuth consent screen

### 7. Publish Your App (Production)

If you're ready for production:

1. Go to "OAuth consent screen"
2. Click "Publish App"
3. Confirm the publishing (this makes your app available to all Google users)

**Note**: While in testing mode, only users you add to "Test users" can sign in.

**Troubleshooting "Access blocked" error:**
- Ensure the domain is added to "Authorized domains" (Step 6)
- Verify the domain verification status shows as verified
- Make sure the app is published (Step 7) or you've added yourself as a test user
- Double-check you entered only the domain name (no `https://` or paths)

## Railway Configuration

This project includes a `railway.json` configuration file that automatically configures:
- Dockerfile-based builds
- Health checks
- Restart policies
- Start command

The configuration is automatically detected by Railway when you deploy.

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
2. Railway will automatically detect:
   - The `railway.json` configuration file
   - The `Dockerfile` for containerized builds
3. The build process will:
   - Build the Next.js app using Docker
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
- `AUTH_TRUST_HOST` or `NEXTAUTH_TRUST_HOST` - Set to `"true"` to trust host headers (auto-enabled in production, but can be explicitly set)

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

### UntrustedHost Error

If you see `UntrustedHost: Host must be trusted` errors:

- The app automatically enables `trustHost` in production environments
- You can explicitly set `AUTH_TRUST_HOST=true` or `NEXTAUTH_TRUST_HOST=true` in Railway environment variables
- This is required because Railway routes traffic through internal container URLs
- If errors persist, verify `NEXTAUTH_URL` is set correctly in Railway environment variables

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
