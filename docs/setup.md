# Setup Guide

Complete setup guide for the Running Dashboard.

---

## Before You Start

- Install Docker & Docker Compose
- Have your Strava API credentials ready (see strava-setup.md)
- Know which parkrun you want to track (default: Kettering)

---

## Step 1: Get the Code

### Option A: Clone Repository

```bash
git clone https://github.com/yourusername/running-dashboard.git
cd running-dashboard
```

### Option B: Download ZIP

Download and extract, then navigate into folder.

---

## Step 2: Prepare Directories

```bash
mkdir -p data logs config
```

This creates local directories for:
- `data/` - SQLite database and backups
- `logs/` - Application logs
- `config/` - Configuration file

---

## Step 3: Configure

### Copy Example Config

```bash
cp config/config.json.example config/config.json
```

### Add Strava Credentials

Edit `config/config.json`:

```json
{
  "strava": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }
}
```

See [Strava Setup Guide](./strava-setup.md) for obtaining credentials.

### (Optional) Adjust Other Settings

- `parkrun.base_url` - Your local parkrun results page
- `parkrun.scrape_schedule` - When to scrape (cron expression)
- `retention.keep_years` - How long to keep data (default: 1)
- `server.port` - Backend port (default: 3001)

---

## Step 4: Start the App

```bash
docker-compose up -d
```

This will:
- Pull Docker images
- Build the app (first time)
- Start the container
- Mount your local directories

---

## Step 5: Verify

Check container status:

```bash
docker-compose ps
```

Should show:
```
      Name                   Command               State           Ports
-------------------------------------------------------------------------------
running-dashboard-app-1   "/docker-entrypoint.…"   Up (healthy)   0.0.0.0:3000->80/tcp
```

Check health:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## Step 6: Connect Strava

1. Open http://localhost:3000
2. Go to **Settings** page
3. Click **"Connect Strava"**
4. Authorize on Strava
5. You'll be redirected back

---

## Step 7: Initial Sync

- After authorizing, the dashboard will automatically sync your activities
- First sync may take a few minutes
- You can also manually trigger from Settings page
- New activities will sync every 6 hours (configurable)

---

## Step 8: View Your Dashboard

- **Dashboard** - Overview with stats and recent runs
- **Runs** - Full list with filters and map view
- **Stats** - Detailed analytics (pace improvement, etc.)
- **Parkrun** - Your parkrun results and predictions
- **Settings** - Configuration, Strava connection, manual actions

---

## Next Steps

### Explore Statistics

- Pace improvement chart (weekly/monthly)
- Distance progression
- Consistency metrics (streaks)
- Location analysis (where you run most)

### Parkrun Integration

- Results will automatically scrape weekly (default Saturday 8 AM)
- Manual scrape available in Parkrun page
- Track your position, finish times, age grading

### Customize

- Adjust data retention in config
- Change scrape schedule
- Set different parkrun URL
- Modify polling interval

---

## Development Mode

If you want to modify the code:

### Backend Development

```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:3001
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### Using Docker Compose for Dev

```bash
docker-compose -f docker-compose.dev.yml up
```

(You may need to create docker-compose.dev.yml - see README)

---

## Common Setup Issues

### "Port 3000 already in use"

Change port in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Access on http://localhost:3001
```

### "Config file not found"

Ensure `config/config.json` exists and is mounted:
```bash
ls -la config/
```

### "Cannot connect to backend"

- Backend runs on port 3001 internally
- Frontend proxies `/api` to backend (in production)
- Check: `curl http://localhost:3001/api/health`

---

## Updating

```bash
git pull
docker-compose pull
docker-compose up -d
```

---

## Backup

The app auto-backs up daily to `data/backups/`. Manual backup:

```bash
cp data/running.db backups/running-$(date +%Y%m%d).db
```

---

## Uninstall

```bash
docker-compose down
# Keep data:
# rm -rf data logs config
# Remove data:
# rm -rf data logs config
```

---

## Documentation Index

- [Strava Setup](./strava-setup.md) - Create Strava API app
- [Configuration](./configuration.md) - All config options
- [API Reference](./api.md) - Endpoint documentation
- [Deployment](./deployment.md) - Production deployment
- [Troubleshooting](./troubleshooting.md) - Solve common issues

---

Enjoy your Running Dashboard!
