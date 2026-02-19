import { Router, Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { getStravaService } from '../../services/strava.service';
import { AppConfig } from '../../config/config.service';

const router = Router();

// GET /api/strava/auth - Get OAuth URL
router.get('/auth', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const stravaService = getStravaService(config);
    const url = stravaService.getAuthUrl();
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/strava/callback - OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, scope, state } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const config = req.app.locals.config as AppConfig;
    const stravaService = getStravaService(config);
    const tokens = await stravaService.exchangeCodeForToken(code as string);

    // Save tokens to config file
    stravaService.saveTokens(tokens);

    // Redirect to frontend settings page
    const frontendUrl = config.frontend.url;
    res.redirect(`${frontendUrl}/settings?strava_connected=true`);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/strava/sync - Manual trigger sync
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const stravaService = getStravaService(config);
    const result = await stravaService.pollActivities();

    console.log(`[Strava] Manual sync: ${result.added} added, ${result.found} fetched, ${result.errors.length} errors`);

    if (result.errors.length > 0) {
      console.warn('[Strava] Sync errors:', result.errors);
    }

    res.json({
      message: 'Sync completed',
      activities_found: result.found,
      activities_added: result.added,
      errors: result.errors
    });
  } catch (error: any) {
    console.error('[Strava] Sync exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/strava/status - Check connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const db = getDatabase(config);
    const refreshToken = db.getSyncMetadata('strava_refresh_token') || config.strava.refresh_token;
    const accessToken = db.getSyncMetadata('strava_access_token') || config.strava.access_token;
    const expiresAtStr = db.getSyncMetadata('strava_token_expires_at') || config.strava.token_expires_at?.toString();

    const connected = !!refreshToken && !!accessToken;
    let tokenValid = false;
    let expiresAt = null;

    if (connected && expiresAtStr) {
      expiresAt = new Date(parseInt(expiresAtStr));
      tokenValid = Date.now() < expiresAt.getTime();
    }

    console.log(`[Strava] Status check: connected=${connected}, token_valid=${tokenValid}`);

    res.json({
      connected,
      token_expires_at: expiresAt,
      token_valid: tokenValid
    });
  } catch (error: any) {
    console.error('[Strava] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
