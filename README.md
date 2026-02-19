# Running Statistics Dashboard

A personal dashboard for tracking running statistics from Strava and parkrun results, with automatic syncing, detailed analytics, and route mapping.

## Features

- **Strava Integration**: Automatic polling to sync all your running activities
- **Parkrun Scraping**: Weekly automated scraping of Kettering parkrun results
- **Statistics & Analytics**:
  - Pace improvement tracking
  - Distance progression over time
  - 5K time predictions
  - Route and location analysis
  - Consistency metrics (streaks, frequency)
- **Route Mapping**: Visualize your runs on OpenStreetMap with Leaflet
- **Configurable**: All settings via `config/config.json`:
  - Strava API credentials
  - Parkrun scrape schedule (cron format)
  - Data retention policies
  - Polling intervals
- **Secure & Local**: Runs entirely on your machine behind your firewall
- **Docker**: Single-container deployment with persistent volumes

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + shadcn/ui
- **Database**: SQLite (via better-sqlite3)
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **Deployment**: Docker (multi-stage build)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/running-dashboard.git
cd running-dashboard
```

2. Create configuration file:
```bash
cp config/config.json.example config/config.json
```

3. Edit `config/config.json` and add your Strava API credentials (see [docs/strava-setup.md](./docs/strava-setup.md))

4. Start the application:
```bash
docker-compose up -d
```

5. Access the dashboard at http://localhost:3000

### Local Development

1. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. Copy and configure:
```bash
cp config/config.json.example config/config.json
# Edit with your Strava credentials
```

3. Start development servers:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

4. Open http://localhost:5173

## Strava Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new app
3. Set Authorization Callback Domain to `localhost`
4. Copy Client ID and Client Secret to `config/config.json`
5. Visit the app, click "Connect Strava" and authorize

See [docs/strava-setup.md](./docs/strava-setup.md) for detailed instructions.

## Configuration

All configuration is in `config/config.json`. Key options:

- **strava.client_id / client_secret**: Strava API credentials
- **strava.poll_interval_hours**: How often to check for new activities (default: 6)
- **parkrun.scrape_schedule**: Cron expression for weekly scraping (default: Saturdays 8 AM)
- **retention.keep_years**: How many years of data to keep (default: 1)
- **server.port**: Backend port (default: 3001)
- **logging.level**: Log level (debug, info, warn, error)

Full reference: [docs/configuration.md](./docs/configuration.md)

## API Endpoints

### Runs
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Get specific run
- `POST /api/runs/upload` - Upload GPX/TCX file
- `DELETE /api/runs/:id` - Delete run
- `GET /api/runs/stats` - Aggregated statistics

### Strava
- `GET /api/strava/auth` - Get OAuth URL
- `GET /api/strava/callback` - OAuth callback
- `POST /api/strava/sync` - Manual trigger sync
- `GET /api/strava/status` - Connection status

### Parkrun
- `GET /api/parkrun/results` - List results
- `POST /api/parkrun/scrape` - Manual scrape
- `GET /api/parkrun/schedule` - Get scrape schedule
- `PUT /api/parkrun/schedule` - Update schedule

### Stats
- `GET /api/stats/summary` - Overall summary
- `GET /api/stats/progress` - Pace improvement
- `GET /api/stats/by-location` - Stats by location
- `GET /api/stats/consistency` - Consistency metrics

Full API documentation: [docs/api.md](./docs/api.md)

## Docker Volumes

The container uses persistent volumes:

- `/data` - SQLite database and backups
- `/logs` - Application log files
- `/config` - Configuration file (config.json)

You can mount local directories:
```yaml
volumes:
  - ./data:/data
  - ./logs:/logs
  - ./config:/config
```

## Project Structure

```
running-dashboard/
├── backend/           # Node.js + Express API
├── frontend/          # React + Vite SPA
├── config/            # Configuration files
├── docs/              # Documentation
├── scripts/           # Helper scripts
├── docker-compose.yml
└── README.md
```

## Maintenance

### View logs
```bash
docker-compose logs -f app
```

### Backup database
```bash
cp data/running.db backups/running-$(date +%Y%m%d).db
```

### Restore database
```bash
cp backups/running-20250219.db data/running.db
```

### Update configuration
Edit `config/config.json` and restart:
```bash
docker-compose restart
```

## Documentation

- [Setup Guide](./docs/setup.md)
- [Strava API Setup](./docs/strava-setup.md)
- [Configuration Reference](./docs/configuration.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)

## License

MIT

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
