# Strava API Setup Guide

This guide walks you through creating a Strava API application to enable automatic activity syncing.

## Step 1: Create Strava App

1. Log in to [Strava](https://www.strava.com)
2. Go to **Settings** → **My API Application**
   - Or visit: https://www.strava.com/settings/api
3. Click **Create & Manage Your App** → **Create a New App**
4. Fill in the details:
   - **App Name**: Running Dashboard (or your preference)
   - **Category**: Personal
   - **Club**: None
   - **Website**: (optional) `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost`
   - **Privacy Policy URL**: (optional for personal use)
   - **Terms of Service URL**: (optional for personal use)
5. Click **Create**

## Step 2: Get Your Credentials

After creating the app, you'll see:

- **Client ID**: Copy this
- **Client Secret**: Click to reveal and copy this

## Step 3: Configure Your Dashboard

1. Open `config/config.json` in your editor
2. Find the `strava` section:
```json
{
  "strava": {
    "client_id": "YOUR_CLIENT_ID_HERE",
    "client_secret": "YOUR_CLIENT_SECRET_HERE",
    ...
  }
}
```
3. Replace with your actual Client ID and Client Secret
4. Save the file
5. Restart the application:
```bash
docker-compose restart
# or for local dev:
# npm run dev (in backend directory)
```

## Step 4: Authorize Your Account

1. Open your dashboard at http://localhost:3000
2. Click the **"Connect Strava"** button (or go to `/settings`)
3. You'll be redirected to Strava's authorization page
4. Click **Authorize**
5. You'll be redirected back to your dashboard
6. The app will now have access to your activity data

## Step 5: Initial Sync

After authorization:
- The backend will automatically trigger an initial sync
- This may take a few minutes depending on your activity history
- New activities will be polled every 6 hours (configurable)

## Troubleshooting

### "Invalid client secret" error
- Double-check that you copied the Client Secret correctly
- Ensure there are no extra spaces or line breaks
- Regenerate the secret if needed from Strava settings

### Redirect URI mismatch
- Ensure Authorization Callback Domain is exactly `localhost` (no http://)
- If you changed the port, update in config `strava.redirect_uri`

### No activities appearing
- Check the logs: `docker-compose logs app`
- Ensure your activities are set to **Public** or **Followers Only**
- Some private activities may not be accessible via API
- Try manual sync: `POST /api/strava/sync` or use the button in Settings

### Rate limiting
- Strava API has rate limits (100 requests per 15 minutes)
- The app uses refresh tokens and polls efficiently
- If you hit limits, increase `poll_interval_hours` in config

## Security Notes

- Your Strava tokens are stored in the SQLite database
- Since this is a local application behind a firewall, risk is minimal
- Never share your `config/config.json` file or database
- If you suspect token compromise, revoke the app from Strava settings and recreate

## Additional Resources

- [Strava API Documentation](https://developers.strava.com/)
- [OAuth Flow Explained](https://developers.strava.com/docs/authentication/)
- [Rate Limits](https://developers.strava.com/docs/rate-limits/)
