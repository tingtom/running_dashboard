import { DatabaseService } from '../services/database.service';
import { Run } from '../models/database.types';
import { AppConfig } from './config.service';

export interface RecommendedRun {
  date: string; // ISO date
  type: 'easy' | 'long' | 'tempo' | 'rest' | 'parkrun';
  distance?: number; // km
  duration?: number; // minutes
  notes: string;
}

export interface WeeklyRecommendation {
  weekStart: string; // Monday date as string
  targetDistance: number; // km
  runs: RecommendedRun[];
}

export interface RecommendationResponse {
  currentStats: {
    weeklyAverage: number;
    currentRunsPerWeek: number;
    last4Weeks: { week: string; distance: number; runs: number }[];
  };
  recommendations: WeeklyRecommendation[];
  rationale: string;
}

export class RecommendationService {
  constructor(private db: DatabaseService, private config?: AppConfig) {}

  generate(weeksAhead: number = 4, goalDistance?: number): RecommendationResponse {
    const runs = this.db.getRuns();

    // Get recent runs (last 8 weeks for better pattern detection)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const recentRuns = runs.filter(r => new Date(r.start_date_local) >= eightWeeksAgo);

    // Calculate current stats
    const weeklyData = this.groupRunsByWeek(recentRuns);
    const avgWeeklyDistance = weeklyData.length > 0
      ? weeklyData.reduce((sum, w) => sum + w.distance, 0) / weeklyData.length
      : 0;
    const avgRunsPerWeek = weeklyData.length > 0
      ? weeklyData.reduce((sum, w) => sum + w.runs, 0) / weeklyData.length
      : 0;

    // Detect user's typical run days (day of week 0-6, Sunday=0)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    recentRuns.forEach(run => {
      const day = new Date(run.start_date_local).getDay();
      dayCounts[day]++;
    });

    // Determine preferred days (days with at least 20% of runs)
    const totalRunsRecent = recentRuns.length || 1;
    const preferredDays = dayCounts
      .map((count, day) => ({ day, count }))
      .filter(d => d.count / totalRunsRecent >= 0.2)
      .map(d => d.day)
      .sort();

    // If no clear pattern, use default (Mon, Wed, Fri, Sun)
    let runDays = preferredDays.length >= 2 ? preferredDays : [1, 3, 5, 0];

    // Parkrun integration
    const parkrunEnabled = this.config?.parkrun?.enabled === true;
    const parkrunDistance = 5.0; // km
    if (parkrunEnabled && !runDays.includes(6)) {
      runDays.push(6); // add Saturday
    }

    // Determine target weekly distance progression
    let currentTarget = goalDistance || Math.round(avgWeeklyDistance);
    if (currentTarget < 5) currentTarget = 5; // minimum 5 km/week

    const recommendations: WeeklyRecommendation[] = [];

    for (let week = 0; week < weeksAhead; week++) {
      const weekTarget = week === 0 ? currentTarget : Math.min(
        goalDistance || Infinity,
        Math.round(currentTarget * Math.pow(1.1, week)) // 10% weekly increase
      );

      // Get Monday of this week
      const weekMonday = this.getWeekStartDate(new Date(), week);

      // Prepare parkrun and adjust target if needed
      let parkrunRun: RecommendedRun | null = null;
      let effectiveRunDays = [...runDays];
      let effectiveTarget = weekTarget;

      if (parkrunEnabled) {
        effectiveTarget -= parkrunDistance;
        if (effectiveTarget < 0) effectiveTarget = 0;
        // Remove Saturday from other runs
        effectiveRunDays = effectiveRunDays.filter(d => d !== 6);

        // Schedule parkrun on Saturday (Monday + 5 days)
        const parkrunDate = new Date(weekMonday);
        parkrunDate.setDate(weekMonday.getDate() + 5);
        parkrunRun = {
          date: parkrunDate.toISOString().split('T')[0],
          type: 'parkrun',
          distance: parkrunDistance,
          duration: Math.round(parkrunDistance * 6),
          notes: 'Weekly parkrun event'
        };
      }

      const weekRuns: RecommendedRun[] = [];

      // Schedule other runs if there are available days
      if (effectiveRunDays.length > 0) {
        // Sort days to prioritize weekend for long run
        const availableDays = [...effectiveRunDays].sort((a, b) => {
          const isWeekendA = a === 0 || a === 6;
          const isWeekendB = b === 0 || b === 6;
          if (isWeekendA && !isWeekendB) return 1;
          if (!isWeekendA && isWeekendB) return -1;
          return a - b;
        });

        const schedule: Array<{ day: number; type: 'easy' | 'long' | 'tempo' | 'rest' }> = [];

        // Long run (prefer weekend)
        const longRunDay = availableDays.find(d => d === 0 || d === 6) || availableDays[0];
        schedule.push({ day: longRunDay, type: 'long' });

        // Tempo run (at least 2 days apart from long run, consider week wrap)
        const remainingDays = availableDays.filter(d => d !== longRunDay);
        const tempoDay = remainingDays.find(d => {
          const daysDiff = Math.abs(d - longRunDay);
          const minDiff = Math.min(daysDiff, 7 - daysDiff);
          return minDiff >= 2;
        }) || remainingDays[0];
        schedule.push({ day: tempoDay, type: 'tempo' });

        // Fill remaining with easy runs
        const otherDays = remainingDays.filter(d => d !== tempoDay);
        const easyDays = otherDays.slice(0, Math.max(2, Math.round(effectiveTarget / 8)));
        easyDays.forEach(day => schedule.push({ day, type: 'easy' }));

        // Create RecommendedRun objects
        schedule.forEach(entry => {
          // Compute date offset from Monday: offset = (entry.day + 6) % 7
          const offset = (entry.day + 6) % 7;
          const runDate = new Date(weekMonday);
          runDate.setDate(weekMonday.getDate() + offset);

          let distance: number | undefined;
          let duration: number | undefined;
          let notes: string;

          switch (entry.type) {
            case 'long':
              distance = Math.round(effectiveTarget * 0.25); // 25% of remaining
              duration = this.estimateDuration(distance, 'easy');
              notes = `Long run at comfortable pace. Stay hydrated.`;
              break;
            case 'tempo':
              distance = Math.round(effectiveTarget * 0.15);
              duration = this.estimateDuration(distance, 'tempo');
              notes = `Tempo run: warm up, ${Math.round(distance)}km at comfortably hard pace, cool down.`;
              break;
            case 'easy':
              distance = Math.round(effectiveTarget * 0.30);
              distance = Math.min(distance, 10); // cap easy runs at 10km
              duration = this.estimateDuration(distance, 'easy');
              notes = `Easy recovery run, conversational pace.`;
              break;
            case 'rest':
            default:
              distance = undefined;
              duration = undefined;
              notes = 'Rest or cross-training day. Recovery is important!';
          }

          weekRuns.push({
            date: runDate.toISOString().split('T')[0],
            type: entry.type,
            distance,
            duration,
            notes
          });
        });
      }

      // Add parkrun if enabled
      if (parkrunRun) {
        weekRuns.push(parkrunRun);
      }

      // Sort by date
      weekRuns.sort((a, b) => a.date.localeCompare(b.date));

      recommendations.push({
        weekStart: weekMonday.toISOString().split('T')[0],
        targetDistance: weekTarget,
        runs: weekRuns
      });
    }

    // Build rationale
    let rationale = `Based on your current weekly average of ${avgWeeklyDistance.toFixed(1)} km over ${avgRunsPerWeek.toFixed(1)} runs/week, we'll gradually increase by ~10% weekly. Your preferred run days are ${runDays.map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')}.`;
    if (parkrunEnabled) {
      rationale += ' Parkrun on Saturdays is included in your schedule.';
    }

    return {
      currentStats: {
        weeklyAverage: Math.round(avgWeeklyDistance * 10) / 10,
        currentRunsPerWeek: Math.round(avgRunsPerWeek * 10) / 10,
        last4Weeks: weeklyData.slice(-4).map(w => ({
          week: w.weekStart,
          distance: Math.round(w.distance * 10) / 10,
          runs: w.runs
        }))
      },
      recommendations,
      rationale
    };
  }

  private groupRunsByWeek(runs: Run[]): Array<{
    weekStart: string; // Monday date as string
    distance: number;
    runs: number;
  }> {
    const groups: { [key: string]: { distance: number; runs: number } } = {};

    runs.forEach(run => {
      const date = new Date(run.start_date_local);
      const weekStart = this.getWeekStartDate(date, 0);
      const key = weekStart.toISOString().split('T')[0];

      if (!groups[key]) {
        groups[key] = { distance: 0, runs: 0 };
      }
      groups[key].distance += run.distance / 1000; // Convert to km
      groups[key].runs += 1;
    });

    return Object.entries(groups)
      .map(([weekStart, data]) => ({ weekStart, ...data }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  private getWeekStartDate(date: Date, weeksAgo: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - weeksAgo * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday (ISO week)
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private estimateDuration(distanceKM: number, type: 'easy' | 'tempo'): number {
    // Rough estimates: easy ~6:00/km, tempo ~5:00/km
    const paceMinutesPerKm = type === 'easy' ? 6.0 : 5.0;
    return Math.round(distanceKM * paceMinutesPerKm);
  }
}
