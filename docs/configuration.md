# Configuration Reference

All configuration is stored in `config/config.json`. This file is read on startup and can be edited while the app is running (some changes may require restart).

## Full Configuration Schema

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  },
  "database": {
    "path": "/data/running.db",
    "backup_path": "/data/backups/"
  },
  "strava": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "http://localhost:3001/api/strava/callback",
    "scopes": "activity:read_all,profile:read_all",
    "refresh_token": "",
    "access_token": "",
    "token_expires_at": null,
    "poll_interval_hours": 6
  },
  "parkrun": {
    "base_url": "https://www.parkrun.org.uk/kettering/results/",
    "scrape_schedule": "0 8 * * 6",
    "scrape_days_back": 90,
    "enabled": true
  },
  "logging": {
    "level": "info",
    "file": "/logs/app.log",
    "max_size_mb": 10,
    "max_files": 5,
    "format": "json"
  },
  "retention": {
    "keep_years": 1,
    "auto_cleanup": true,
    "cleanup_schedule": "0 2 * * 0"
  },
  "frontend": {
    "url": "http://localhost:3000"
  }
}
```

## Configuration Sections

### Server

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3001 | Port the backend API listens on |
| `host` | string | "0.0.0.0" | Host interface to bind (use 127.0.0.1 for localhost only) |

### Database

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | "/data/running.db" | SQLite database file path |
| `backup_path` | string | "/data/backups/" | Directory for automatic backups |

### Strava

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `client_id` | string | required | Strava API Client ID |
| `client_secret` | string | required | Strava API Client Secret |
| `redirect_uri` | string | "http://localhost:3001/api/strava/callback" | OAuth callback URL |
| `scopes` | string | "activity:read_all,profile:read_all" | API permissions requested |
| `refresh_token` | string | auto-filled | OAuth refresh token (managed by app) |
| `access_token` | string | auto-filled | OAuth access token (managed by app) |
| `token_expires_at` | number | auto-filled | Token expiry timestamp (managed by app) |
| `poll_interval_hours` | number | 6 | How often to check for new activities |

### Parkrun

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base_url` | string | "https://www.parkrun.org.uk/kettering/results/" | Parkrun results page URL |
| `scrape_schedule` | string | "0 8 * * 6" | Cron expression for scraping (Saturdays 8 AM) |
| `scrape_days_back` | number | 90 | How many days back to scrape on manual trigger |
| `enabled` | boolean | true | Enable/disable parkrun scraping |

**Cron Format**: `minute hour day-of-month month day-of-week`

Examples:
- `"0 8 * * 6"` = Every Saturday at 8:00 AM
- `"0 2 * * 0"` = Every Sunday at 2:00 AM
- `"*/6 * * * *"` = Every 6 minutes

### Logging

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | string | "info" | Log level: "debug", "info", "warn", "error" |
| `file` | string | "/logs/app.log" | Log file path |
| `max_size_mb` | number | 10 | Maximum log file size before rotation (MB) |
| `max_files` | number | 5 | Number of rotated log files to keep |
| `format` | string | "json" | Log format: "json" or "simple" |

### Retention

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keep_years` | number | 1 | Years of run data to retain (older deleted) |
| `auto_cleanup` | boolean | true | Enable automatic cleanup of old data |
| `cleanup_schedule` | string | "0 2 * * 0" | Cron expression for cleanup (Sundays 2 AM) |

### Frontend

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | "http://localhost:3000" | Frontend URL for CORS and redirects |

## Environment Variables (Alternative)

You can also configure via environment variables (takes precedence over file):

- `PORT`: Server port
- `HOST`: Server host
- `DATABASE_PATH`: Database path
- `CONFIG_PATH`: Path to config file (default: `/config/config.json`)
- `LOG_LEVEL`: Logging level
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`: Strava credentials
- `PARKRUN_ENABLED`: `true`/`false`

Example:
```bash
export STRAVA_CLIENT_ID=12345
docker-compose up
```

## Best Practices

1. **Use Docker volumes**: Mount `/data`, `/logs`, `/config` to persist data
2. **Regular backups**: Copy `running.db` from `/data` regularly
3. **Monitor logs**: Check `/logs/app.log` for errors
4. **Configure retention**: Adjust `keep_years` based on disk space
5. **Secure config**: File permissions 600 on `config/config.json`
6. **Test cron**: Verify cron expressions at [crontab.guru](https://crontab.guru)

## Changing Configuration

1. Edit `config/config.json`
2. Restart the container:
```bash
docker-compose restart
```
3. Check logs for any errors:
```bash
docker-compose logs -f app
```

Some changes (like polling interval, log level) may take effect immediately without restart.

## Advanced: Custom Parkrun URL

If you want to track a different parkrun, change the `base_url`:

- Kettering: `https://www.parkrun.org.uk/kettering/results/`
- Bedford: `https://www.parkrun.org.uk/bedford/results/`
- Wimbledon: `https://www.parkrun.org.uk/wimbledon/results/`
- Any other UK parkrun: `https://www.parkrun.org.uk/[name]/results/`

For international parkruns, use the appropriate domain (e.g., `parkrun.com`, `parkrun.org.za`).
