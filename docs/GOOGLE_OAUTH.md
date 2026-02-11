# Google OAuth Setup

To enable Google OAuth authentication, you need to create OAuth 2.0 credentials in Google Cloud Console. Follow these steps:

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Coffee Tracker")
5. Click "Create"
6. Wait for the project to be created, then select it from the dropdown

## 2. Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Identity Services API" (or "Google+ API")
3. Click on it and click "Enable"

## 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Coffee Tracker (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
   - Add: `email`, `profile`, `openid`, `https://www.googleapis.com/auth/spreadsheets`
   - Click "Update" → "Save and Continue"
7. On the "Test users" page (if in testing mode), add your email address
8. Click "Save and Continue" → "Back to Dashboard"

## 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ Create Credentials" → "OAuth client ID"
3. Select application type: "Web application"
4. Enter a name (e.g., "Coffee Tracker Web Client")
5. Add authorized JavaScript origins:
   - For local development: `http://localhost:8787`
   - For production: `https://your-domain.com` (update after deployment)
6. Add authorized redirect URIs:
   - For local development: `http://localhost:8787/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google` (update after deployment)
7. Click "Create"
8. **Important**: Copy and save both:
   - **Client ID** → use for `GOOGLE_CLIENT_ID` in your `.env` file
   - **Client Secret** → use for `GOOGLE_CLIENT_SECRET` in your `.env` file
   - ⚠️ The secret is only shown once! Save it securely.

## 5. Update Credentials After Deployment

After deploying to production and getting your app URL:

1. Go back to "APIs & Services" → "Credentials"
2. Click on your OAuth 2.0 Client ID
3. Add your production domain to:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
4. Click "Save"

## 6. Publish Your App (Production)

If you're ready for production:

1. Go to "OAuth consent screen"
2. Click "PUBLISH APP"
3. Confirm the action

## Notes

- For local development, you can skip OAuth setup by setting `ENABLE_DEV_USER=true` in your `.env` file. This bypasses authentication and uses a local dev user.
- The app requires the `spreadsheets` scope for Google Sheets integration functionality.
- Make sure to save your Client Secret securely, as it's only shown once during creation.
