import { AppConfig } from '../config/config.service';
import { DatabaseService, getDatabase } from './database.service';
import { RunStats, PaceProgress, LocationCluster, ConsistencyStats } from '../models/database.types';

export class StatsService {
  private config: AppConfig;
  private db: DatabaseService;

  constructor(config: AppConfig) {
    this.config = config;
    this.db = getDatabase(config);
  }

  // Overall summary stats
  getSummary(days?: number): RunStats {
    return this.db.getRunStats(days);
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
    const weeklyData: { [key: number]: number } = {};

    const now = new Date();
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekNum = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
      weeklyData[weekNum] = 0;
    }

    for (const run of runs) {
      const runDate = new Date(run.start_date);
      const weekNum = Math.floor(runDate.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (weeklyData[weekNum] !== undefined) {
        weeklyData[weekNum] += run.distance / 1000; // Convert to km
      }
    }

    return Object.entries(weeklyData)
      .map(([weekNum, distance]) => ({
        week: `Week ${parseInt(weekNum)}`,
        distance: Math.round(distance * 10) / 10
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
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
