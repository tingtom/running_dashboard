import { AppConfig } from '../config/config.service';
import { DatabaseService, getDatabase } from './database.service';
import { RunStats, PaceProgress, LocationCluster, ConsistencyStats } from '../models/database.types';

// Helper to convert parkrun finish_time (HH:MM:SS or MM:SS) to seconds
function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export class StatsService {
  private config: AppConfig;
  private db: DatabaseService;

  constructor(config: AppConfig) {
    this.config = config;
    this.db = getDatabase(config);
  }

  // Overall summary stats (including parkrun if enabled)
  getSummary(days?: number): RunStats {
    const runStats = this.db.getRunStats(days);

    if (this.config.parkrun.enabled) {
      // Compute date boundaries for parkrun filter
      let startDate?: string;
      let endDate?: string;
      if (days) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }
      const parkrunResults = this.db.getParkrunResults({ startDate, endDate });

      if (parkrunResults.length > 0) {
        let prDistance = 0;
        let prTime = 0;
        let prCount = parkrunResults.length;
        let maxDist = 0;
        for (const pr of parkrunResults) {
          prDistance += pr.distance;
          prTime += parseTimeToSeconds(pr.finish_time);
          if (pr.distance > maxDist) maxDist = pr.distance;
        }

        // Update totals
        runStats.total_runs += prCount;
        runStats.total_distance += prDistance;
        runStats.total_time += prTime;

        // Recompute averages
        if (runStats.total_runs > 0) {
          runStats.average_distance = runStats.total_distance / runStats.total_runs;
        }
        if (runStats.total_distance > 0 && runStats.total_time > 0) {
          runStats.average_speed_kmh = parseFloat(((runStats.total_distance / 1000) / (runStats.total_time / 3600)).toFixed(1));
          runStats.average_pace_seconds = Math.round(runStats.total_time / (runStats.total_distance / 1000));
        } else {
          runStats.average_speed_kmh = 0;
          runStats.average_pace_seconds = 0;
        }

        // Update longest run
        if (maxDist > runStats.longest_run) {
          runStats.longest_run = maxDist;
        }
        // Note: most_frequent_day remains from runs only; could be recalculated but skip
      }
    }

    return runStats;
  }

  // Pace improvement over time
  getPaceProgress(period: 'weekly' | 'monthly' = 'weekly'): PaceProgress[] {
    return this.db.getPaceProgress(period);
  }

  // Stats grouped by location
  getByLocation(radiusMeters?: number): LocationCluster[] {
    return this.db.getLocationClusters(radiusMeters);
  }

  // Consistency metrics
  getConsistency(days?: number): ConsistencyStats {
    return this.db.getConsistencyStats(days);
  }

  // 5K time prediction based on recent runs
  predict5KTime(): { predicted_seconds: number; predicted_time: string; confidence: string } | null {
    // Get last 10 runs with distance >= 4km (to predict 5K)
    const runs = this.db.getRuns({
      limit: 20,
      sortBy: 'start_date',
      sortOrder: 'desc'
    });

    const recentFarRuns = runs.filter(r => r.distance >= 4000);
    if (recentFarRuns.length === 0) {
      return null;
    }

    // Calculate average pace of these runs
    const paces = recentFarRuns
      .map(r => (r.moving_time * 1000) / r.distance) // seconds per km
      .filter(p => p > 0);

    if (paces.length === 0) return null;

    const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
    const predicted5KSeconds = avgPace * 5; // Extrapolate to 5K

    // Confidence based on number of data points
    let confidence = 'low';
    if (paces.length >= 10) confidence = 'high';
    else if (paces.length >= 5) confidence = 'medium';

    return {
      predicted_seconds: Math.round(predicted5KSeconds),
      predicted_time: this.formatPace(predicted5KSeconds),
      confidence
    };
  }

  // Get personal records
  getPersonalRecords(): {
    longest_distance: { distance: number; date: string } | null;
    fastest_5k: { time: string; date: string } | null;
    fastest_10k: { time: string; date: string } | null;
    most_elevation: { elevation: number; date: string } | null;
  } {
    const runs = this.db.getRuns({ limit: 1000 }); // Get many runs

    // Longest distance
    const longest = runs.reduce((max, run) => run.distance > (max?.distance || 0) ? run : max, null as any);
    const longest_distance = longest ? {
      distance: longest.distance / 1000, // Convert to km
      date: longest.start_date_local
    } : null;

    // Find fastest 5K (need runs >= 5km)
    const fiveKs = runs.filter(r => r.distance >= 5000 && (r.moving_time * 1000) / r.distance > 0);
    const fastest5k = fiveKs.reduce((best, run) => {
      const pace = (run.moving_time * 1000) / run.distance;
      return pace < ((best?.pace || Infinity)) ? { ...run, pace } : best;
    }, null as any);
    const fastest_5k = fastest5k ? {
      time: this.formatPace((fastest5k.moving_time * 1000) / 5000 * 5),
      date: fastest5k.start_date_local
    } : null;

    // Find fastest 10K
    const tenKs = runs.filter(r => r.distance >= 10000 && (r.moving_time * 1000) / r.distance > 0);
    const fastest10k = tenKs.reduce((best, run) => {
      const pace = (run.moving_time * 1000) / run.distance;
      return pace < ((best?.pace || Infinity)) ? { ...run, pace } : best;
    }, null as any);
    const fastest_10k = fastest10k ? {
      time: this.formatPace((fastest10k.moving_time * 1000) / 10000 * 10),
      date: fastest10k.start_date_local
    } : null;

    // Most elevation gain
    const mostElevation = runs.reduce((max, run) => (run.total_elevation_gain || 0) > (max?.elevation || 0) ? run : max, null as any);
    const most_elevation = mostElevation ? {
      elevation: Math.round(mostElevation.total_elevation_gain || 0),
      date: mostElevation.start_date_local
    } : null;

    return {
      longest_distance: longest_distance,
      fastest_5k: fastest_5k,
      fastest_10k: fastest_10k,
      most_elevation: most_elevation
    };
  }

  // Weekly distance chart data
  getWeeklyDistance(weeks: number = 12): { week: string; distance: number }[] {
    const runs = this.db.getRuns();
    const weeklyData: { [key: number]: number } = {}; // key: weekStart timestamp (ms)

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today

    // Find the start of the current week (Sunday)
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ...
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - dayOfWeek); // go back to Sunday
    currentWeekStart.setHours(0, 0, 0, 0);

    // Initialize weeks
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() - (i * 7));
      const weekKey = weekStart.getTime();
      weeklyData[weekKey] = 0;
    }

    // Aggregate runs
    for (const run of runs) {
      const runDate = new Date(run.start_date);
      // Compute week start (Sunday) for runDate
      const runDay = runDate.getDay();
      const runWeekStart = new Date(runDate);
      runWeekStart.setDate(runDate.getDate() - runDay);
      runWeekStart.setHours(0, 0, 0, 0);
      const weekKey = runWeekStart.getTime();

      if (weeklyData.hasOwnProperty(weekKey)) {
        weeklyData[weekKey] += run.distance / 1000; // Convert to km
      }
    }

    // Convert to array, sort by weekKey ascending (oldest first), then format
    const result: { weekKey: number; weekLabel: string; distance: number }[] = [];
    Object.entries(weeklyData).forEach(([weekKey, distance]) => {
      const weekDate = new Date(parseInt(weekKey));
      const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({
        weekKey: parseInt(weekKey),
        weekLabel,
        distance: Math.round(distance * 10) / 10
      });
    });

    result.sort((a, b) => a.weekKey - b.weekKey);

    return result.map(item => ({ week: item.weekLabel, distance: item.distance }));
  }

  // Helper: format pace (seconds per km) to MM:SS
  private formatPace(secondsPerKm: number): string {
    const minutes = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

let statsServiceInstance: StatsService | null = null;

export function getStatsService(config: AppConfig): StatsService {
  if (!statsServiceInstance) {
    statsServiceInstance = new StatsService(config);
  }
  return statsServiceInstance;
}
