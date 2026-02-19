# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently no authentication required (local deployment only). Future versions may support optional API keys.

---

## Endpoints

### Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-02-19T12:34:56.789Z",
  "version": "1.0.0"
}
```

---

### Runs

#### List Runs

**GET** `/runs`

Get all running activities with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (ISO 8601) | Filter runs after this date |
| `endDate` | string (ISO 8601) | Filter runs before this date |
| `limit` | number | Maximum number of results (default: 100) |
| `offset` | number | Pagination offset |
| `sortBy` | string | Field to sort by (default: `start_date`) |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |

**Response:**
```json
{
  "runs": [
    {
      "id": 1,
      "strava_id": 123456789,
      "name": "Morning Run",
      "distance": 5000,
      "moving_time": 1500,
      "elapsed_time": 1600,
      "start_date": "2025-02-19T07:30:00Z",
      "start_date_local": "2025-02-19T07:30:00",
      "type": "Run",
      "average_speed": 3.33,
      "max_speed": 5.0,
      "average_heartrate": 145,
      "max_heartrate": 165,
      "total_elevation_gain": 50,
      "latitude_start": 52.123,
      "longitude_start": -0.456,
      "latitude_end": 52.124,
      "longitude_end": -0.457,
      "polyline": "encoded_polyline_string",
      "created_at": "2025-02-19T12:34:56.789Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

#### Get Single Run

**GET** `/runs/:id`

Get details for a specific run.

**Response:** Same as run object above.

#### Upload GPX/TCX

**POST** `/runs/upload`

Upload a GPX or TCX file. Requires `multipart/form-data`.

**Body:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | GPX or TCX file |
| `name` (optional) | string | Custom name for the run |

**Response:**
```json
{
  "id": 2,
  "name": "Uploaded Run",
  "message": "Run uploaded successfully"
}
```

#### Delete Run

**DELETE** `/runs/:id`

Permanently delete a run.

**Response:**
```json
{
  "message": "Run deleted"
}
```

---

### Strava Integration

#### Get Auth URL

**GET** `/strava/auth`

Get the Strava OAuth authorization URL.

**Response:**
```json
{
  "url": "https://www.strava.com/oauth/authorize?client_id=...&redirect_uri=..."
}
```

#### OAuth Callback

**GET** `/strava/callback`

OAuth redirect endpoint from Strava. Usually handled automatically.

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `code` | Authorization code from Strava |
| `scope` | Granted permissions |
| `state` | State parameter (if used) |

**Response:** Redirects to frontend settings page.

#### Manual Sync

**POST** `/strava/sync`

Manually trigger a Strava sync (fetches new activities).

**Response:**
```json
{
  "message": "Sync started",
  "activities_found": 5,
  "activities_added": 3
}
```

#### Connection Status

**GET** `/strava/status`

Check if Strava is connected and token validity.

**Response:**
```json
{
  "connected": true,
  "token_expires_at": "2025-03-21T12:00:00Z",
  "token_valid": true
}
```

---

### Parkrun

#### List Results

**GET** `/parkrun/results`

Get parkrun results with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (ISO 8601) | Results after this date |
| `endDate` | string (ISO 8601) | Results before this date |
| `runnerName` | string | Filter by runner name (partial match) |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "parkrun_date": "2025-02-15T09:00:00Z",
      "event_number": 123,
      "runner_name": "John Smith",
      "position": 15,
      "total_runners": 250,
      "finish_time": "00:21:34",
      "age_category": "VM40-44",
      "age_grading": 75.3,
      "gender": "M",
      "gender_position": 12,
      "club": "Some Club",
      "note": ""
    }
  ],
  "total": 12
}
```

#### Manual Scrape

**POST** `/parkrun/scrape`

Manually trigger a parkrun scrape.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `daysBack` | number | Number of days to look back (default: 90) |

**Response:**
```json
{
  "message": "Scrape completed",
  "results_found": 5,
  "results_added": 3,
  "results_updated": 2
}
```

#### Get Schedule

**GET** `/parkrun/schedule`

Get current parkrun scrape schedule.

**Response:**
```json
{
  "schedule": "0 8 * * 6",
  "next_run": "2025-02-22T08:00:00Z",
  "enabled": true
}
```

#### Update Schedule

**PUT** `/parkrun/schedule`

Update the parkrun scrape schedule.

**Body:**
```json
{
  "schedule": "0 8 * * 6",
  "enabled": true
}
```

**Response:**
```json
{
  "message": "Schedule updated",
  "schedule": "0 8 * * 6",
  "enabled": true
}
```

---

### Statistics

#### Summary

**GET** `/stats/summary`

Get overall running statistics.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Lookback period in days (default: 365) |

**Response:**
```json
{
  "total_runs": 150,
  "total_distance": 750000,
  "total_distance_km": 750,
  "total_time": 75000,
  "total_time_hours": 20.8,
  "average_distance_per_run": 5000,
  "average_pace": "05:00",
  "average_speed_kmh": 12,
  "longest_run": 15000,
  "most_frequent_day": "Wednesday"
}
```

#### Progress (Pace Improvement)

**GET** `/stats/progress`

Get pace improvement data over time.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `weekly`, `monthly` (default: `weekly`) |

**Response:**
```json
{
  "period": "weekly",
  "data": [
    {
      "period_start": "2025-01-01",
      "avg_pace_seconds": 300,
      "avg_pace": "05:00",
      "run_count": 5
    },
    ...
  ]
}
```

#### By Location

**GET** `/stats/by-location`

Get statistics grouped by location (start coordinates rounded to ~1km).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `radius_meters` | number | Clustering radius (default: 1000) |

**Response:**
```json
{
  "locations": [
    {
      "lat": 52.123,
      "lon": -0.456,
      "label": "Kettering Town Centre",
      "run_count": 25,
      "total_distance": 125000,
      "avg_distance": 5000
    },
    ...
  ]
}
```

#### Consistency

**GET** `/stats/consistency`

Get consistency metrics.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Lookback period (default: 30) |

**Response:**
```json
{
  "period_days": 30,
  "runs_in_period": 20,
  "current_streak": 5,
  "longest_streak": 12,
  "avg_runs_per_week": 4.8,
  "days_since_last_run": 1
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes:**

- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Not found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable entity (invalid file format)
- `500` - Internal server error

---

## Rate Limiting

Currently no rate limiting (local deployment). If exposed externally, consider adding:
- 100 requests per minute per IP
- Burst allowance of 20

---

## CORS

CORS is enabled for the frontend URL specified in config. To allow additional origins, modify the CORS configuration in `backend/src/index.ts`.

---

## Pagination

List endpoints support pagination via `limit` and `offset`. Default limit is 100, maximum 1000.

Response includes:
```json
{
  "runs": [...],
  "total": 150,
  "limit": 100,
  "offset": 0,
  "has_more": true
}
```

To get next page, increment `offset` by `limit`.

---

## Date Formats

All dates in requests/responses use ISO 8601 format:
- UTC: `2025-02-19T12:34:56.789Z`
- Local: `2025-02-19T12:34:56` (no timezone indicator)

For query parameters, you can use any format parseable by JavaScript Date:
- `2025-02-19`
- `2025-02-19T12:34`
- `1739988896000` (timestamp)

---

## Data Units

- `distance`: meters
- `speed`: meters per second
- `pace`: calculated as seconds per km
- `time`: seconds
- `elevation`: meters

Frontend converts to user-friendly units (km, km/h, min:sec/km).
