# Deployment Guide

This guide covers deploying the Running Dashboard using Docker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deploy](#quick-deploy)
3. [Configuration](#configuration)
4. [Volumes & Persistence](#volumes--persistence)
5. [Updates](#updates)
6. [Backup & Restore](#backup--restore)
7. [Monitoring](#monitoring)
8. [SSL/TLS (Optional)](#ssltls-optional)
9. [Production Hardening](#production-hardening)

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- (Optional) Domain name if exposing externally

---

## Quick Deploy

1. **Clone or download** the repository

2. **Create configuration:**
```bash
mkdir -p data logs config
cp config/config.json.example config/config.json
# Edit config/config.json with your Strava credentials
```

3. **Start services:**
```bash
docker-compose up -d
```

4. **Verify:**
```bash
curl http://localhost:3000/api/health
# Should return {"status":"ok",...}
```

5. **Access:** Open browser to http://localhost:3000

---

## Configuration

### Initial Setup

1. **Strava API:**
   - Follow [strava-setup.md](./strava-setup.md)
   - Add `client_id` and `client_secret` to `config/config.json`

2. **Review config:**
   - `parkrun.base_url`: Should point to your parkrun
   - `parkrun.scrape_schedule`: Cron expression for weekly scraping
   - `retention.keep_years`: Data retention period
   - `server.port`: Internal port (keep 3001)

3. **Restart if needed:**
```bash
docker-compose restart
```

### Environment Variables (Optional)

You can override config with environment variables:

```bash
export STRAVA_CLIENT_ID=your_id
export STRAVA_CLIENT_SECRET=your_secret
docker-compose up
```

See [configuration.md](./configuration.md) for full list.

---

## Volumes & Persistence

The application uses Docker volumes to persist data:

```yaml
volumes:
  - ./data:/data          # Database and backups
  - ./logs:/logs          # Log files
  - ./config:/config      # Config file
```

**Important:** Do NOT use anonymous volumes in production without backup strategy.

### Changing Volume Paths

Edit `docker-compose.yml`:

```yaml
services:
  app:
    volumes:
      - /opt/running-dashboard/data:/data
      - /var/log/running-dashboard:/logs
      - /etc/running-dashboard/config:/config
```

---

## Updates

### Pull Latest Changes

```bash
git pull
docker-compose pull
docker-compose up -d
```

### Rebuild from Source

If you modify the code:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Zero-Downtime Updates

Using Docker Compose:

```bash
docker-compose up -d --no-deps --build app
```

The app will restart briefly. For true zero-downtime, consider:
- Running two instances behind a reverse proxy
- Health checks prevent traffic to unhealthy containers
- Database schema migrations are backward compatible

---

## Backup & Restore

### Automatic Backups

The app creates daily backups to `/data/backups/` if configured.

### Manual Backup

```bash
# Backup database
cp data/running.db backups/running-$(date +%Y%m%d-%H%M%S).db

# Backup config
cp config/config.json backups/config-$(date +%Y%m%d).json

# Optional: compress
tar -czf backup-$(date +%Y%m%d).tar.gz data/running.db config/config.json logs/
```

### Restore

```bash
# Stop app
docker-compose down

# Restore database
cp backups/running-20250219.db data/running.db

# Restore config (if needed)
cp backups/config-20250219.json config/config.json

# Restart
docker-compose up -d
```

### Scheduled Backups

Add to crontab:

```bash
0 2 * * * cd /path/to/running-dashboard && tar -czf /backup/running-$(date +\%Y\%m\%d).tar.gz data/running.db config/config.json logs/ >/dev/null 2>&1
```

---

## Monitoring

### View Logs

```bash
# All logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Error only
docker-compose logs -f app | grep -i error
```

### Check Health

```bash
curl http://localhost:3001/api/health
```

Or use Docker:

```bash
docker-compose ps  # Should show "healthy"
```

### Log Rotation

Logs inside container rotate automatically (see `logging.max_files` in config).

To rotate host logs:
```bash
# Move logs
mv logs/app.log logs/app.log.1
# Docker will create new file
docker-compose restart
```

### Metrics

Future enhancement: Add Prometheus metrics endpoint at `/api/metrics`.

---

## SSL/TLS (Optional)

If exposing externally with a domain:

### Using Caddy (Easiest)

Create `Caddyfile`:
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

Then add Caddy to docker-compose:
```yaml
caddy:
  image: caddy:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

### Using Nginx

Configure SSL with Let's Encrypt using Nginx as reverse proxy.

---

## Production Hardening

### 1. Change Default Port Binding

Instead of `3000:80`, use random high port or Unix socket:

```yaml
ports:
  - "127.0.0.1:3000:80"  # Only accessible from localhost
```

Then use SSH tunnel or VPN for remote access.

### 2. Add Reverse Proxy with Authentication

Use Nginx with basic auth:

```nginx
location / {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://app:80;
}
```

Create htpasswd: `htpasswd -c /etc/nginx/.htpasswd username`

### 3. Enable Firewall

```bash
# UFW example
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp  # If using SSL
sudo ufw enable
```

### 4. Secure Config Permissions

```bash
chmod 600 config/config.json
chmod 700 data logs
```

### 5. Regular Updates

```bash
# Schedule weekly rebuilds
0 3 * * 0 cd /path/to/app && docker-compose pull && docker-compose up -d
```

### 6. Log Shipping (Optional)

Ship logs to external system:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        tag: "running-dashboard"
```

Or use Fluentd/Logstash driver.

---

## Troubleshooting

### Container Won't Start

```bash
docker-compose logs app  # Check logs
docker-compose ps        # Check status
docker-compose config    # Validate compose file
```

Common issues:
- Port conflict: Change `ports` mapping
- Missing config: Ensure `config/config.json` exists
- Permission denied: Check volume permissions

### Database Locked

SQLite doesn't handle multiple writers well. Ensure:
- Single container (already configured)
- Not accessing DB from host simultaneously
- Backups are taken when container is stopped

### No Data Syncing

Check:
1. Strava credentials correct (`config/config.json`)
2. Token valid (`GET /api/strava/status`)
3. Poll interval reasonable (not too frequent)
4. Network connectivity to Strava API

### High Disk Usage

Check log size:
```bash
du -sh logs/
du -sh data/
```

Adjust `logging.max_size_mb` and `retention.keep_years`.

---

## Uninstall

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data!)
docker-compose down -v

# Or manually remove data directories
rm -rf data logs config
```

---

## Support

- Issues: https://github.com/yourusername/running-dashboard/issues
- Docs: See other documentation files
- Logs: Check `logs/app.log`
