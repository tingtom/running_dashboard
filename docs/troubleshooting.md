# Troubleshooting Guide

Common issues and their solutions.

---

## API / Backend Issues

### "Cannot GET /api/health"

**Problem:** Backend not running or wrong port.

**Solution:**
```bash
docker-compose ps  # Check container status
docker-compose logs app
# Ensure backend is listening on port 3001 internally
```

### "Error: Database is locked"

**Problem:** SQLite database accessed by multiple processes.

**Solution:**
- Ensure only one container instance running
- Stop container before accessing DB from host
- Add `busy_timeout` to database config

### "No activities found"

**Problem:** Strava auth not completed or no activities in range.

**Solution:**
1. Verify Strava connection: `curl http://localhost:3001/api/strava/status`
2. Check logs: `docker-compose logs app | grep strava`
3. Ensure Strava activities are public
4. Trigger manual sync via API or Settings page

### "Invalid client secret" on auth

**Problem:** Wrong Strava credentials.

**Solution:**
1. Double-check values in `config/config.json`
2. Ensure no extra whitespace
3. Verify app exists in [Strava Settings](https://www.strava.com/settings/api)
4. Regenerate client secret if needed

---

## Frontend Issues

### Blank page / Nothing loads

**Problem:** Frontend can't reach backend (CORS or wrong URL).

**Solution:**
1. Open browser DevTools (F12) → Console
2. Check for CORS errors or failed requests
3. Verify `frontend.url` in config matches backend
4. Check network tab for actual request URLs

### 404 on navigation

**Problem:** React Router needs server config to handle client-side routing.

**Solution:**
The Docker Nginx config already includes this. If running locally:
- Frontend dev server (Vite) handles it automatically
- For production build, ensure Nginx `try_files` directive exists

---

## Docker Issues

### "Port already in use"

**Problem:** Another service using port 3000.

**Solution:**
```bash
# Find process
sudo lsof -i :3000
# Or change port in docker-compose.yml:
# ports: - "3001:80"
```

### Permission denied on volumes

**Problem:** Host directory permissions incorrect.

**Solution:**
```bash
sudo chown -R $(id -u):$(id -g) data logs config
chmod 700 data logs
chmod 600 config/config.json
```

### Container keeps restarting

**Problem:** Application error.

**Solution:**
```bash
docker-compose logs app  # Look for error stack traces
docker-compose exec app cat logs/app.log
```

Common causes:
- Invalid config JSON
- Missing dependencies (node_modules not installed)
- Database corruption

---

## Parkrun Issues

### "Scrape failed" in logs

**Problem:** Parkrun website structure changed or blocked.

**Solution:**
1. Check if base_url is accessible: `curl https://www.parkrun.org.uk/kettering/results/`
2. Inspect logs for specific error
3. Parkrun may rate-limit or block scrapers; reduce frequency
4. Update scraper parsing logic if HTML structure changed

### No results added

**Problem:** Runner name doesn't match or already exists.

**Solution:**
- Results are matched by name; ensure exact spelling
- Duplicate results are skipped, not added again
- Increase `scrape_days_back` to look further back

---

## Performance Issues

### Slow page loads

**Problem:** Unoptimized queries or large dataset.

**Solution:**
1. Add database indexes:
```sql
CREATE INDEX idx_runs_start_date ON runs(start_date);
CREATE INDEX idx_parkrun_results_date ON parkrun_results(parkrun_date);
```
2. Implement pagination (already in API)
3. Increase retention time to reduce rows
4. Enable query result caching

### High memory usage

**Problem:** Large datasets loaded into memory.

**Solution:**
- Frontend: Use virtual scrolling for long tables
- Backend: Stream large result sets instead of loading all
- Reduce `limit` default from 100 to 50

---

## Data Issues

### Missing GPS data for maps

**Problem:** Some activities don't contain polyline data.

**Solution:**
- Only activities recorded with GPS have polylines
- Manual uploads may lack polyline
- Map will show only start/end markers if no polyline

### Duplicate runs appearing

**Problem:** Same activity imported multiple times.

**Solution:**
- Runs are deduplicated by `strava_id`
- Manual uploads have no Strava ID → may create duplicates
- Add manual upload deduplication by checking name + date + distance

### Incorrect pace/distance

**Problem:** Data from source (Strava) may have errors.

**Solution:**
- Verify on Strava website
- Manual edits not yet supported (delete and re-upload if manual)
- Future: Add edit functionality

---

## Configuration Issues

### Changes not applied after restart

**Problem:** Editing wrong config file.

**Solution:**
```bash
# Check which config is loaded
docker-compose exec app env | grep CONFIG_PATH
# Default: /config/config.json
ls -la config/
```

### Invalid JSON syntax

**Problem:** Typo in config.json.

**Solution:**
```bash
cat config/config.json | python3 -m json.tool
# Or use any JSON validator
docker-compose logs app  # Will show parse error
```

---

## Authentication Issues

### "Token expired" error

**Problem:** Strava access token expired (usually 6 hours).

**Solution:**
- App auto-refreshes tokens using refresh token
- If refresh fails, re-authorize from Settings page
- Check `strava.refresh_token` exists in config

### "Redirect URI mismatch"

**Problem:** Strava callback URL doesn't match.

**Solution:**
1. Strava app settings → Authorization Callback Domain must be `localhost` (no port)
2. Or if using custom domain: `yourdomain.com`
3. Ensure `strava.redirect_uri` in config matches exactly

---

## Logging Issues

### No logs appearing in file

**Problem:** Permissions or wrong path.

**Solution:**
```bash
# Check log path in config
cat config/config.json | grep -A2 logging

# Verify container can write
docker-compose exec app touch /logs/test.log
ls -la logs/
```

### Logs too verbose

**Problem:** Debug level flooding logs.

**Solution:**
Change `logging.level` to `"info"` or `"warn"`.

---

## Sync Issues

### Sync taking too long

**Problem:** Large number of activities to process.

**Solution:**
- First sync may take time (all history)
- Subsequent syncs are faster (only new activities)
- Increase `poll_interval_hours` to reduce frequency
- Check backend logs for progress

### Activities missing from specific dates

**Problem:** Strava API pagination or filtering issue.

**Solution:**
- Ensure activities are not marked private
- Some activities excluded by type (only "Run" stored)
- Use manual sync with expanded date range

---

## Map Not Displaying

### Map tiles don't load

**Problem:** No internet or blocked tiles.

**Solution:**
- Check browser console for CORS/network errors
- Leaflet uses OpenStreetMap tiles; must have internet
- If behind proxy, may need tile configuration

### Polyline not showing

**Problem:** Missing or malformed polyline data.

**Solution:**
- Check API response for runs includes `polyline` field
- Only GPS-enabled activities have polylines
- Open browser DevTools → Network to inspect API response

---

## Windows/Mac Specific

### File permission errors on host volumes

**Problem:** Docker Desktop on Windows/Mac uses different user IDs.

**Solution:**
Let Docker manage permissions (don't bind to host paths in dev):
```yaml
# Use named volumes in dev
volumes:
  - data:/data
  - logs:/logs
  - config:/config
```

Or use Docker Desktop file sharing settings.

---

## Getting Help

1. **Check logs:** `docker-compose logs app`
2. **Test health:** `curl http://localhost:3001/api/health`
3. **Verify config:** `cat config/config.json`
4. **Search issues:** https://github.com/yourusername/running-dashboard/issues

If reporting a bug, include:
- Docker compose version (`docker-compose version`)
- Logs output
- Config (with secrets redacted)
- Steps to reproduce

---

## Reset & Start Fresh

**WARNING:** This deletes all data!

```bash
docker-compose down
rm -rf data logs
# Optionally: rm config/config.json and start fresh
docker-compose up -d
```

---

## Must-Know Commands

```bash
# Restart everything
docker-compose restart

# View logs (follow)
docker-compose logs -f app

# Exec into container
docker-compose exec app sh

# Check database
docker-compose exec app sqlite3 /data/running.db ".tables"

# Force rebuild
docker-compose build --no-cache && docker-compose up -d

# Stop and remove everything
docker-compose down -v
```

---

Still stuck? Create an issue with logs and configuration details.
