import axios, { AxiosInstance } from 'axios';
import polyline from 'polyline';
import { AppConfig } from '../config/config.service';
import { DatabaseService, getDatabase } from './database.service';
import { StravaActivity, StravaTokenResponse, StravaAthlete } from '../models/database.types';
import { Run } from '../models/database.types';

export class StravaService {
  private config: AppConfig;
  private db: DatabaseService;
  private client: AxiosInstance;
  private configPath: string;

  constructor(config: AppConfig) {
    this.config = config;
    this.configPath = process.env.CONFIG_PATH || '/config/config.json';
    this.db = getDatabase(config);

    this.client = axios.create({
      baseURL: 'https://www.strava.com/api/v3',
      timeout: 30000
    });
  }

  // Set tokens for API calls
  private setAuthHeaders(accessToken: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }

  // Generate OAuth URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.strava.client_id,
      redirect_uri: this.config.strava.redirect_uri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: this.config.strava.scopes
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.strava.client_id,
      client_secret: this.config.strava.client_secret,
      code,
      grant_type: 'authorization_code'
    });

    const response = await axios.post('https://www.strava.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.strava.client_id,
      client_secret: this.config.strava.client_secret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post('https://www.strava.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  }

  // Ensure valid token, refresh if needed
  async ensureValidToken(): Promise<string> {
    const refreshToken = this.config.strava.refresh_token;
    const expiresAt = this.config.strava.token_expires_at;

    if (!refreshToken) {
      throw new Error('Strava not authorized. Please connect your account.');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiresAt ? expiresAt - now : 0;

    // Refresh if less than 1 hour remaining
    if (expiresIn < 3600) {
      try {
        const tokens = await this.refreshAccessToken(refreshToken);
        this.saveTokens(tokens);
        return tokens.access_token;
      } catch (error) {
        throw new Error(`Failed to refresh Strava token: ${error}`);
      }
    }

    return this.config.strava.access_token;
  }

  // Save tokens to config and database
  saveTokens(tokens: StravaTokenResponse): void {
    // Update in-memory config
    this.config.strava.access_token = tokens.access_token;
    this.config.strava.refresh_token = tokens.refresh_token;
    this.config.strava.token_expires_at = tokens.expires_at;

    // Persist to config file
    const fs = require('fs');
    let configJson;
    try {
      configJson = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch (e) {
      configJson = { strava: {} };
    }

    configJson.strava = {
      ...configJson.strava,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at
    };

    fs.writeFileSync(this.configPath, JSON.stringify(configJson, null, 2) + '\n');
  }

  // Poll for new activities
  async pollActivities(): Promise<{ found: number; added: number; errors: string[] }> {
    const errors: string[] = [];
    let found = 0;
    let added = 0;

    try {
      const accessToken = await this.ensureValidToken();
      this.setAuthHeaders(accessToken);

      // Get last sync time
      const lastSync = this.db.getSyncMetadata('last_strava_sync');
      const after = lastSync ? new Date(lastSync).getTime() / 1000 : null;

      // Fetch activities
      const params: any = { per_page: 200 };
      if (after) {
        params.after = after;
      }

      const response = await this.client.get<StravaActivity[]>('/athlete/activities', { params });
      const activities = response.data;
      found = activities.length;

      // Process each activity
      for (const activity of activities) {
        try {
          // Skip non-running activities
          if (activity.type !== 'Run') continue;

          // Check if already exists
          const existing = this.db.getRunByStravaId(activity.id);
          if (existing) continue;

          // Prepare run data
          const run: Omit<Run, 'id' | 'created_at' | 'updated_at'> = {
            strava_id: activity.id,
            name: activity.name || 'Untitled Run',
            distance: activity.distance || 0,
            moving_time: activity.moving_time || 0,
            elapsed_time: activity.elapsed_time || 0,
            start_date: new Date(activity.start_date).toISOString(),
            start_date_local: activity.start_date_local,
            type: activity.type,
            upload_id: activity.upload_id || null,
            average_speed: activity.average_speed || null,
            max_speed: activity.max_speed || null,
            average_heartrate: activity.average_heartrate || null,
            max_heartrate: activity.max_heartrate || null,
            total_elevation_gain: activity.total_elevation_gain || null,
            elev_high: activity.elev_high || null,
            elev_low: activity.elev_low || null,
            location_country: activity.location_country || null,
            location_state: activity.location_state || null,
            location_city: activity.location_city || null,
            latitude_start: activity.start_latlng?.[0] || null,
            longitude_start: activity.start_latlng?.[1] || null,
            latitude_end: activity.end_latlng?.[0] || null,
            longitude_end: activity.end_latlng?.[1] || null,
            polyline: activity.map?.summary_polyline || null
          };

          this.db.insertRun(run);
          added++;
        } catch (err: any) {
          errors.push(`Activity ${activity.id}: ${err.message}`);
        }
      }

      // Update last sync time
      const now = Date.now() / 1000;
      this.db.setSyncMetadata('last_strava_sync', new Date(now * 1000).toISOString());
    } catch (error: any) {
      errors.push(`Poll failed: ${error.response?.data?.message || error.message}`);
    }

    return { found, added, errors };
  }

  // Get athlete info
  async getAthlete(): Promise<StravaAthlete | null> {
    try {
      const accessToken = await this.ensureValidToken();
      this.setAuthHeaders(accessToken);

      const response = await this.client.get<StravaAthlete>('/athlete');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Decode polyline to GeoJSON coordinates
  decodePolyline(encoded: string): [number, number][] {
    try {
      return polyline.decode(encoded, 5); // precision 5 as per Strava
    } catch (error) {
      console.error('Failed to decode polyline:', error);
      return [];
    }
  }
}

let stravaServiceInstance: StravaService | null = null;

export function getStravaService(config: AppConfig): StravaService {
  if (!stravaServiceInstance) {
    stravaServiceInstance = new StravaService(config);
  }
  return stravaServiceInstance;
}
