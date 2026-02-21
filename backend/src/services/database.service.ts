import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AppConfig } from '../config/config.service';
import { Run, ParkrunResult, SyncMetadata, RunStats, PaceProgress, LocationCluster, ConsistencyStats, CustomEvent } from '../models/database.types';

export class DatabaseService {
  private db: Database.Database;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    // Ensure data directory exists
    const dbDir = path.dirname(this.config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.config.database.path);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON');

    this.createTables();
    this.createIndexes();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strava_id INTEGER UNIQUE,
        name TEXT NOT NULL,
        distance REAL,
        moving_time INTEGER,
        elapsed_time INTEGER,
        start_date TEXT,
        start_date_local TEXT,
        type TEXT,
        upload_id INTEGER,
        average_speed REAL,
        max_speed REAL,
        average_heartrate REAL,
        max_heartrate REAL,
        total_elevation_gain REAL,
        elev_high REAL,
        elev_low REAL,
        location_country TEXT,
        location_state TEXT,
        location_city TEXT,
        latitude_start REAL,
        longitude_start REAL,
        latitude_end REAL,
        longitude_end REAL,
        polyline TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parkrun_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parkrun_date TEXT,
        event_number INTEGER,
        runner_name TEXT NOT NULL,
        position INTEGER,
        total_runners INTEGER,
        finish_time TEXT,
        age_category TEXT,
        age_grading REAL,
        gender TEXT,
        gender_position INTEGER,
        club TEXT,
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parkrun_date, runner_name, finish_time)
      );

       CREATE TABLE IF NOT EXISTS sync_metadata (
         key TEXT PRIMARY KEY,
         value TEXT,
         updated_at TEXT DEFAULT CURRENT_TIMESTAMP
       );

       CREATE TABLE IF NOT EXISTS custom_events (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         date TEXT NOT NULL, -- ISO 8601 date (YYYY-MM-DD)
         title TEXT NOT NULL,
         description TEXT,
         created_at TEXT DEFAULT CURRENT_TIMESTAMP,
         updated_at TEXT DEFAULT CURRENT_TIMESTAMP
       );
     `);
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_runs_start_date ON runs(start_date);
      CREATE INDEX IF NOT EXISTS idx_runs_type ON runs(type);
      CREATE INDEX IF NOT EXISTS idx_runs_strava_id ON runs(strava_id);
       CREATE INDEX IF NOT EXISTS idx_parkrun_results_date ON parkrun_results(parkrun_date);
       CREATE INDEX IF NOT EXISTS idx_parkrun_results_name ON parkrun_results(runner_name);
       CREATE INDEX IF NOT EXISTS idx_sync_metadata_key ON sync_metadata(key);
       CREATE INDEX IF NOT EXISTS idx_custom_events_date ON custom_events(date);
     `);
  }

  // Runs CRUD
  insertRun(run: Omit<Run, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO runs (
        strava_id, name, distance, moving_time, elapsed_time, start_date, start_date_local,
        type, upload_id, average_speed, max_speed, average_heartrate, max_heartrate,
        total_elevation_gain, elev_high, elev_low, location_country, location_state,
        location_city, latitude_start, longitude_start, latitude_end, longitude_end, polyline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      run.strava_id,
      run.name,
      run.distance,
      run.moving_time,
      run.elapsed_time,
      run.start_date,
      run.start_date_local,
      run.type,
      run.upload_id,
      run.average_speed,
      run.max_speed,
      run.average_heartrate,
      run.max_heartrate,
      run.total_elevation_gain,
      run.elev_high,
      run.elev_low,
      run.location_country,
      run.location_state,
      run.location_city,
      run.latitude_start,
      run.longitude_start,
      run.latitude_end,
      run.longitude_end,
      run.polyline
    );

    return result.lastInsertRowid as number;
  }

  getRun(id: number): Run | null {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE id = ?');
    return stmt.get(id) as Run | null;
  }

  getRunByStravaId(stravaId: number): Run | null {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE strava_id = ?');
    return stmt.get(stravaId) as Run | null;
  }

  getRuns(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Run[] {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.startDate) {
      conditions.push('start_date >= ?');
      values.push(params.startDate);
    }
    if (params?.endDate) {
      conditions.push('start_date <= ?');
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = params?.sortBy ? `ORDER BY ${params.sortBy} ${params.sortOrder || 'DESC'}` : 'ORDER BY start_date DESC';
    const limit = params?.limit ? `LIMIT ${params.limit}` : '';
    const offset = params?.offset ? `OFFSET ${params.offset}` : '';

    const stmt = this.db.prepare(`SELECT * FROM runs ${whereClause} ${orderBy} ${limit} ${offset}`);
    return stmt.all(...values) as Run[];
  }

  countRuns(startDate?: string, endDate?: string): number {
    const conditions: string[] = [];
    const values: any[] = [];

    if (startDate) {
      conditions.push('start_date >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('start_date <= ?');
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM runs ${whereClause}`);
    const result = stmt.get(...values) as { count: number };
    return result.count;
  }

  deleteRun(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM runs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteRunByStravaId(stravaId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM runs WHERE strava_id = ?');
    const result = stmt.run(stravaId);
    return result.changes > 0;
  }

  // Parkrun CRUD
  upsertParkrunResult(result: Omit<ParkrunResult, 'id' | 'created_at'>): number {
    // Use INSERT OR REPLACE based on unique constraint
    const stmt = this.db.prepare(`
      INSERT INTO parkrun_results (
        parkrun_date, event_number, runner_name, position, total_runners,
        finish_time, age_category, age_grading, gender, gender_position, club, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(parkrun_date, runner_name, finish_time) DO UPDATE SET
        position = excluded.position,
        total_runners = excluded.total_runners,
        age_category = excluded.age_category,
        age_grading = excluded.age_grading,
        gender = excluded.gender,
        gender_position = excluded.gender_position,
        club = excluded.club,
        note = excluded.note
    `);

    const resultDb = stmt.run(
      result.parkrun_date,
      result.event_number,
      result.runner_name,
      result.position,
      result.total_runners,
      result.finish_time,
      result.age_category,
      result.age_grading,
      result.gender,
      result.gender_position,
      result.club,
      result.note
    );

    return resultDb.lastInsertRowid as number;
  }

  getParkrunResults(params?: {
    startDate?: string;
    endDate?: string;
    runnerName?: string;
    limit?: number;
    offset?: number;
  }): ParkrunResult[] {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.startDate) {
      conditions.push('parkrun_date >= ?');
      values.push(params.startDate);
    }
    if (params?.endDate) {
      conditions.push('parkrun_date <= ?');
      values.push(params.endDate);
    }
    if (params?.runnerName) {
      conditions.push('runner_name LIKE ?');
      values.push(`%${params.runnerName}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = 'ORDER BY parkrun_date DESC, position ASC';
    const limit = params?.limit ? `LIMIT ${params.limit}` : '';
    const offset = params?.offset ? `OFFSET ${params.offset}` : '';

    const stmt = this.db.prepare(`SELECT * FROM parkrun_results ${whereClause} ${orderBy} ${limit} ${offset}`);
    return stmt.all(...values) as ParkrunResult[];
  }

  countParkrunResults(startDate?: string, endDate?: string, runnerName?: string): number {
    const conditions: string[] = [];
    const values: any[] = [];

    if (startDate) {
      conditions.push('parkrun_date >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('parkrun_date <= ?');
      values.push(endDate);
    }
    if (runnerName) {
      conditions.push('runner_name LIKE ?');
      values.push(`%${runnerName}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM parkrun_results ${whereClause}`);
    const result = stmt.get(...values) as { count: number };
    return result.count;
   }

  // Custom Events CRUD
  insertCustomEvent(event: Omit<CustomEvent, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO custom_events (date, title, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(event.date, event.title, event.description || null);
    return result.lastInsertRowid as number;
  }

  getCustomEvents(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): CustomEvent[] {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.startDate) {
      conditions.push('date >= ?');
      values.push(params.startDate);
    }
    if (params?.endDate) {
      conditions.push('date <= ?');
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = params?.sortBy ? `ORDER BY ${params.sortBy} ${params.sortOrder || 'ASC'}` : 'ORDER BY date DESC, id ASC';
    const limit = params?.limit ? `LIMIT ${params.limit}` : '';
    const offset = params?.offset ? `OFFSET ${params.offset}` : '';

    const stmt = this.db.prepare(`SELECT * FROM custom_events ${whereClause} ${orderBy} ${limit} ${offset}`);
    return stmt.all(...values) as CustomEvent[];
  }

  getCustomEvent(id: number): CustomEvent | null {
    const stmt = this.db.prepare('SELECT * FROM custom_events WHERE id = ?');
    return stmt.get(id) as CustomEvent | null;
  }

  updateCustomEvent(id: number, event: Partial<CustomEvent>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (event.date !== undefined) { fields.push('date = ?'); values.push(event.date); }
    if (event.title !== undefined) { fields.push('title = ?'); values.push(event.title); }
    if (event.description !== undefined) { fields.push('description = ?'); values.push(event.description); }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE custom_events SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteCustomEvent(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM custom_events WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Sync Metadata
  getSyncMetadata(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  setSyncMetadata(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, value);
  }

  // Statistics
  getRunStats(days?: number): RunStats {
    const dateCondition = days ? `WHERE start_date >= datetime('now', '-${days} days')` : '';
     const stmt = this.db.prepare(`
       SELECT
         COUNT(*) as total_runs,
         SUM(distance) as total_distance,
         SUM(moving_time) as total_time,
         AVG(distance) as average_distance,
         AVG(CASE WHEN distance > 0 AND moving_time > 0 THEN (moving_time * 1000) / distance END) as avg_pace_seconds,
         AVG(average_speed) * 3.6 as avg_speed_kmh,
         MAX(distance) as longest_run,
         strftime('%w', start_date_local) as weekday
       FROM runs
       ${dateCondition}
     `);
    const result = (stmt.get() as any) || {};

    // Determine most frequent day
    const weekdayMap: { [key: string]: number } = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6 };
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Get most frequent day separately
    const dayStmt = this.db.prepare(`
      SELECT strftime('%w', start_date_local) as weekday, COUNT(*) as count
      FROM runs
      ${dateCondition}
      GROUP BY weekday
      ORDER BY count DESC
      LIMIT 1
    `);
    const dayResult = dayStmt.get() as { weekday: string } | undefined;
    const mostFrequentDay = dayResult ? weekdayNames[parseInt(dayResult.weekday)] : 'N/A';

    return {
      total_runs: result.total_runs || 0,
      total_distance: result.total_distance || 0,
      total_time: result.total_time || 0,
      average_distance: result.average_distance || 0,
      average_pace_seconds: result.avg_pace_seconds || 0,
      average_speed_kmh: result.avg_speed_kmh || 0,
      longest_run: result.longest_run || 0,
      most_frequent_day: mostFrequentDay
    };
  }

  getPaceProgress(period: 'weekly' | 'monthly' = 'weekly'): PaceProgress[] {
    const dateFormat = period === 'weekly' ? "'%Y-%W'" : "'%Y-%m'";
    const labelFormat = period === 'weekly' ? 'Week of %Y-%m-%d' : '%Y-%m';

    const stmt = this.db.prepare(`
      SELECT
        strftime(${dateFormat}, start_date) as period,
        MIN(start_date) as period_start,
        COUNT(*) as run_count,
        AVG(CASE WHEN distance > 0 THEN (moving_time * 1000) / distance END) as avg_pace_seconds
      FROM runs
      GROUP BY period
      ORDER BY period_start ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => ({
      period_start: row.period_start,
      period_label: new Date(row.period_start).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      avg_pace_seconds: Math.round(row.avg_pace_seconds) || 0,
      avg_pace: this.secondsToPace(row.avg_pace_seconds || 0),
      run_count: row.run_count
    }));
  }

  getLocationClusters(radiusMeters: number = 1000): LocationCluster[] {
    // Simple clustering: group by rounded lat/lon
    // More sophisticated clustering would use DBSCAN or similar
    const stmt = this.db.prepare(`
      SELECT
        ROUND(latitude_start, 4) as lat_round,
        ROUND(longitude_start, 4) as lon_round,
        COUNT(*) as run_count,
        SUM(distance) as total_distance,
        AVG(distance) as avg_distance
      FROM runs
      WHERE latitude_start IS NOT NULL AND longitude_start IS NOT NULL
      GROUP BY lat_round, lon_round
      ORDER BY run_count DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => ({
      lat: row.lat_round,
      lon: row.lon_round,
      label: `${row.lat_round}, ${row.lon_round}`,
      run_count: row.run_count,
      total_distance: row.total_distance,
      avg_distance: row.avg_distance
    }));
  }

  getConsistencyStats(days: number = 30): ConsistencyStats {
    const now = new Date();
    const periodCondition = `start_date >= date('now', '-${days} days')`;

    // Count runs in period
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM runs WHERE ${periodCondition}`);
    const countResult = countStmt.get() as { count: number };
    let runs_in_period = countResult.count;

    // Activity dates set for current streak (within period)
    const activityDatesSet = new Set<number>();

    // Add run dates in period (distinct days)
    const runDatesStmt = this.db.prepare(`
      SELECT DATE(start_date) as date FROM runs
      WHERE ${periodCondition}
      GROUP BY date
    `);
    const runDateRows = runDatesStmt.all() as { date: string }[];
    for (const row of runDateRows) {
      activityDatesSet.add(new Date(row.date + 'T00:00:00').getTime());
    }

    // Include parkrun if enabled
    if (this.config.parkrun.enabled) {
      // Parkrun count in period
      const prCountStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM parkrun_results
        WHERE parkrun_date IS NOT NULL AND parkrun_date >= date('now', '-${days} days')
      `);
      const prCountResult = prCountStmt.get() as { count: number };
      runs_in_period += prCountResult.count;

      // Parkrun distinct dates in period
      const prDateStmt = this.db.prepare(`
        SELECT DATE(parkrun_date) as date FROM parkrun_results
        WHERE parkrun_date IS NOT NULL AND parkrun_date >= date('now', '-${days} days')
        GROUP BY date
      `);
      const prDateRows = prDateStmt.all() as { date: string }[];
      for (const row of prDateRows) {
        activityDatesSet.add(new Date(row.date + 'T00:00:00').getTime());
      }
    }

    const activeDates = Array.from(activityDatesSet).sort((a, b) => a - b);

    // Current streak: consecutive days ending at most recent activity date within period
    let currentStreak = 0;
    if (activeDates.length > 0) {
      let check = activeDates[activeDates.length - 1];
      while (activityDatesSet.has(check)) {
        currentStreak++;
        check -= 86400000; // 24 hours in ms
      }
    }

    // Longest streak: all-time combined dates (runs + parkrun)
    const allTimeDatesSet = new Set<number>();
    const allRunsStmt = this.db.prepare('SELECT start_date FROM runs');
    const allRuns = allRunsStmt.all() as { start_date: string }[];
    for (const r of allRuns) {
      allTimeDatesSet.add(new Date(r.start_date).setHours(0, 0, 0, 0));
    }
    if (this.config.parkrun.enabled) {
      const allPrStmt = this.db.prepare('SELECT parkrun_date FROM parkrun_results WHERE parkrun_date IS NOT NULL');
      const allPrs = allPrStmt.all() as { parkrun_date: string }[];
      for (const p of allPrs) {
        allTimeDatesSet.add(new Date(p.parkrun_date).setHours(0, 0, 0, 0));
      }
    }
    const allTimeSorted = Array.from(allTimeDatesSet).sort((a, b) => a - b);
    let longestStreak = 0;
    if (allTimeSorted.length > 0) {
      let tempStreak = 1;
      let prev = allTimeSorted[0];
      for (let i = 1; i < allTimeSorted.length; i++) {
        const curr = allTimeSorted[i];
        if (curr - prev === 86400000) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        prev = curr;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Days since last activity (run or parkrun)
    const lastActivity = allTimeSorted.length > 0 ? allTimeSorted[allTimeSorted.length - 1] : 0;
    const daysSinceLast = lastActivity === 0
      ? days // no activity ever, use period as fallback
      : Math.floor((now.getTime() - lastActivity) / (1000 * 60 * 60 * 24));

    // Average runs per week
    const weeks = days / 7;
    const avgRunsPerWeek = runs_in_period / weeks;
    const roundedAvg = Math.round(avgRunsPerWeek * 10) / 10;

    return {
      period_days: days,
      runs_in_period,
      current_streak,
      longest_streak,
      avg_runs_per_week: roundedAvg,
      days_since_last_run: daysSinceLast
    };
  }

  // Cleanup old data based on retention policy
  cleanupOldRuns(keepYears: number = 1): number {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - keepYears);
    const cutoffStr = cutoffDate.toISOString();

    const stmt = this.db.prepare('DELETE FROM runs WHERE start_date < ?');
    const result = stmt.run(cutoffStr);
    return result.changes;
  }

  // Database maintenance
  backup(backupPath: string): void {
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // SQLite backup via file copy (WAL mode ensures consistency)
    const destDb = new Database(backupPath);
    this.db.backup(destDb);
    destDb.close();
  }

  vacuum(): void {
    this.db.exec('VACUUM');
  }

  // Utility
  private secondsToPace(seconds: number): string {
    if (!seconds || seconds <= 0) return 'N/A';
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  close(): void {
    this.db.close();
  }
}

let dbInstance: DatabaseService | null = null;

export function getDatabase(config: AppConfig): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(config);
  }
  return dbInstance;
}

export function initializeDatabase(config: AppConfig): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(config);
  }
  return dbInstance;
}
