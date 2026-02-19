// Run activity from Strava (or manual upload)
export interface Run {
  id?: number; // Auto-increment
  strava_id: number | null; // Null for manual uploads
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  start_date: string; // ISO 8601 UTC
  start_date_local: string; // Local datetime (no timezone)
  type: string; // e.g., 'Run'
  upload_id: number | null;
  average_speed: number | null; // m/s
  max_speed: number | null; // m/s
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number | null;
  elev_high: number | null;
  elev_low: number | null;
  location_country: string | null;
  location_state: string | null;
  location_city: string | null;
  latitude_start: number | null;
  longitude_start: number | null;
  latitude_end: number | null;
  longitude_end: number | null;
  polyline: string | null; // Encoded polyline for map
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// Parkrun result
export interface ParkrunResult {
  id?: number;
  parkrun_date: string; // ISO 8601 (Saturday)
  event_number: number;
  runner_name: string;
  position: number;
  total_runners: number;
  finish_time: string; // HH:MM:SS
  age_category: string;
  age_grading: number | null;
  gender: 'M' | 'F' | string;
  gender_position: number | null;
  club: string | null;
  note: string | null;
  created_at: string;
}

// Sync metadata (for token storage, last sync timestamps, etc.)
export interface SyncMetadata {
  key: string;
  value: string;
  updated_at: string;
}

// Stats aggregates
export interface RunStats {
  total_runs: number;
  total_distance: number; // meters
  total_time: number; // seconds
  average_distance: number; // meters
  average_pace_seconds: number; // per km
  average_speed_kmh: number;
  longest_run: number;
  most_frequent_day: string;
}

export interface PaceProgress {
  period_start: string;
  period_label: string;
  avg_pace_seconds: number;
  avg_pace: string;
  run_count: number;
}

export interface LocationCluster {
  lat: number;
  lon: number;
  label: string;
  run_count: number;
  total_distance: number;
  avg_distance: number;
}

export interface ConsistencyStats {
  period_days: number;
  runs_in_period: number;
  current_streak: number;
  longest_streak: number;
  avg_runs_per_week: number;
  days_since_last_run: number;
}

// API request/response types
export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  start_date_local: string;
  type: string;
  upload_id: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;
  elev_high?: number;
  elev_low?: number;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  map?: {
    summary_polyline: string;
  };
  location_country?: string;
  location_state?: string;
  location_city?: string;
}

export interface StravaAthlete {
  id: number;
  username?: string;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
}
