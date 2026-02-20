import axios from 'axios';
import * as cheerio from 'cheerio';
import { AppConfig } from '../config/config.service';
import { DatabaseService, getDatabase } from './database.service';
import { ParkrunResult } from '../models/database.types';

export class ParkrunService {
  private config: AppConfig;
  private db: DatabaseService;

  constructor(config: AppConfig) {
    this.config = config;
    this.db = getDatabase(config);
  }

  // Scrape parkrun results for given date range
  async scrapeResults(daysBack: number = 90): Promise<{
    eventsFound: number;
    resultsAdded: number;
    resultsUpdated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let eventsFound = 0;
    let added = 0;
    let updated = 0;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    // Parkrun events are on Saturdays
    // We'll iterate through each Saturday in the range
    const saturdays: Date[] = [];
    const current = new Date(endDate);
    current.setHours(0, 0, 0, 0);

    // Find the most recent Saturday
    const dayOfWeek = current.getDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7 || 7; // Saturday is 6
    current.setDate(current.getDate() - daysSinceSaturday);

    while (current >= startDate) {
      saturdays.push(new Date(current));
      current.setDate(current.getDate() - 7);
    }

    for (const saturday of saturdays) {
      try {
        const dateStr = saturday.toISOString().split('T')[0]; // YYYY-MM-DD
        const url = `${this.config.parkrun.base_url}${dateStr}/`;

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RunningDashboard/1.0)'
          },
          timeout: 10000
        });

        if (response.status !== 200) {
          errors.push(`HTTP ${response.status} for ${dateStr}`);
          continue;
        }

         const results = this.parseResultsPage(response.data, dateStr);
         eventsFound++;

         console.log(`[Parkrun] ${dateStr}: parsed ${results.length} results`);

         for (const result of results) {
           try {
             const existing = this.db.getParkrunResults({
               startDate: dateStr,
               endDate: dateStr,
               runnerName: result.runner_name
             });

             if (existing.length > 0) {
               // Update existing
               this.db.upsertParkrunResult(result);
               updated++;
             } else {
               // Add new
               this.db.upsertParkrunResult(result);
               added++;
             }
           } catch (err: any) {
             errors.push(`${dateStr} - ${result.runner_name}: ${err.message}`);
           }
         }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // No event on this date, skip silently
          continue;
        }
        errors.push(`${saturday.toISOString().split('T')[0]}: ${error.message}`);
      }
    }

    return { eventsFound, resultsAdded: added, resultsUpdated: updated, errors };
  }

  // Parse HTML page and extract results
  private parseResultsPage(html: string, dateStr: string): ParkrunResult[] {
    const $ = cheerio.load(html);
    const results: ParkrunResult[] = [];

    console.log(`[Parkrun] Parsing HTML for ${dateStr}, length: ${html.length} bytes`);

    // Find the results table - parkrun typically uses a table with class "results"
    let table = $('table.results, table[class*="Result"], table[class*="result"]').first();

    if (!table.length) {
      console.log(`[Parkrun] No table with class 'results' found for ${dateStr}`);
      // Alternative: look for any table with results data
      const tables = $('table');
      console.log(`[Parkrun] Found ${tables.length} tables on page, scanning for results...`);

      let resultsTable: cheerio.Element | null = null;

      for (let i = 0; i < tables.length; i++) {
        const tableEl = tables[i];
        const hasHeader = $(tableEl).find('th').length >= 5;
        const numericData = $(tableEl).find('td:nth-child(2)').text().match(/\d+:\d+/); // Time format
        console.log(`[Parkrun] Table ${i}: ${$(tableEl).find('th').length} headers, hasTime=${!!numericData}`);
        if (hasHeader || numericData) {
          resultsTable = tableEl;
          break;
        }
      }

      if (!resultsTable) {
        console.log(`[Parkrun] No suitable results table found for ${dateStr}`);
        return results;
      }
      table = $(resultsTable);
    }

    console.log(`[Parkrun] Using table with ${table.find('th').length} header columns`);

    // Get headers
    const headers: string[] = [];
    table.find('th').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });
    console.log(`[Parkrun] Headers: ${headers.join(', ')}`);

    // Get rows
    const rows = table.find('tbody tr');
    console.log(`[Parkrun] Found ${rows.length} data rows`);
    let rowCount = 0;
    rows.each((_, tr) => {
      const row: { [key: string]: string } = {};
      $(tr).find('td').each((i, td) => {
        if (headers[i]) {
          row[headers[i]] = $(td).text().trim();
        }
      });

      if (!row['position'] && !row['pos']) {
        return; // skip
      }

      try {
        const result = this.mapRowToResult(row, dateStr);
        if (result) {
          results.push(result);
          rowCount++;
        }
      } catch (e) {
        // Skip malformed rows
        console.log(`[Parkrun] Row parsing error: ${e}`);
      }
    });

    console.log(`[Parkrun] Successfully parsed ${rowCount} results for ${dateStr}`);
    return results;
  }

  // Map table row to ParkrunResult
  private mapRowToResult(row: { [key: string]: string }, dateStr: string): ParkrunResult | null {
    // Parkrun format varies slightly between events
    // Common field names:
    // position, pos, place
    // name, runner
    // time, finish time
    // gender, sex
    // age category, age cat
    // club, team
    // age grade

    const positionStr = row['position'] || row['pos'] || row['place'];
    const position = positionStr ? parseInt(positionStr.replace(/\D/g, '')) : null;

    const runnerName = row['name'] || row['runner'] || '';
    if (!runnerName) return null;

    const finishTime = row['time'] || row['finish time'] || row['chip time'] || '';

    const totalRunnersStr = row['total runners'] || row['finishers'] || row['total'];
    const totalRunners = totalRunnersStr ? parseInt(totalRunnersStr.replace(/\D/g, '')) : null;

    const gender = (row['gender'] || row['sex'] || '').toUpperCase();
    const genderPositionStr = row['gender position'] || row['gender pos'] || '';
    const genderPosition = genderPositionStr ? parseInt(genderPositionStr.replace(/\D/g, '')) : null;

    const ageCategory = row['age category'] || row['age cat'] || row['agegrade cat'] || '';
    const ageGradingStr = row['age grade'] || row['age grading'] || '';
    const ageGrading = ageGradingStr ? parseFloat(ageGradingStr.replace(/[^0-9.]/g, '')) : null;

    const club = row['club'] || row['team'] || null;
    const note = row['note'] || row['comments'] || null;

    return {
      parkrun_date: new Date(dateStr).toISOString(),
      event_number: this.extractEventNumberFromUrl() || 0,
      runner_name: runnerName.trim(),
      position,
      total_runners: totalRunners,
      finish_time: finishTime.trim(),
      age_category: ageCategory.trim(),
      age_grading: ageGrading,
      gender: gender === 'F' ? 'F' : 'M', // Default to M if unknown
      gender_position: genderPosition,
      club,
      note
    };
  }

  // Extract event number from URL (if present)
  private extractEventNumberFromUrl(): number {
    // URL might contain event number like /results/12345/
    // but we'll use 0 for now
    return 0;
  }

  // Get schedule
  getSchedule(): { schedule: string; next_run: string; enabled: boolean } {
    const next = this.calculateNextRun(this.config.parkrun.scrape_schedule);
    return {
      schedule: this.config.parkrun.scrape_schedule,
      next_run: next.toISOString(),
      enabled: this.config.parkrun.enabled
    };
  }

  // Calculate next run from cron expression (simplified)
  private calculateNextRun(cronExpr: string): Date {
    // Cron: "minute hour day month weekday"
    // Example: "0 8 * * 6" = 8:00 AM on Saturdays (weekday 6)
    const parts = cronExpr.trim().split(/\s+/);

    const now = new Date();
    let next = new Date();

    try {
      if (parts.length >= 5) {
        const minute = parseInt(parts[0], 10);
        const hour = parseInt(parts[1], 10);
        const weekday = parseInt(parts[4], 10); // 5th part is weekday (0=Sunday, 6=Saturday)

        if (isNaN(hour) || isNaN(minute) || isNaN(weekday)) {
          throw new Error('Invalid cron parts - must be numbers');
        }

        // Set to the next occurrence of this weekday
        next = new Date();
        next.setHours(hour, minute, 0, 0);

        const currentWeekday = next.getDay();
        let daysUntil = (weekday - currentWeekday + 7) % 7;

        // If the target day is today but time has passed, move to next week
        if (daysUntil === 0 && next <= now) {
          daysUntil = 7;
        }

        next.setDate(next.getDate() + daysUntil);

        // Double-check we're in the future
        if (next <= now) {
          next.setDate(next.getDate() + 7);
        }
      } else {
        // Fallback: return now + 1 day if cron format invalid
        next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        console.warn(`Invalid cron expression: "${cronExpr}". Using fallback schedule.`);
      }
    } catch (error: any) {
      console.error(`Error calculating next run from cron "${cronExpr}":`, error.message);
      next = new Date(now.getTime() + 24 * 60 * 60 * 1000); // fallback
    }

    return next;
  }

  // Get runner's best time and position stats
  getRunnerStats(runnerName: string): {
    totalRuns: number;
    bestTime: string | null;
    avgPosition: number;
    recentRuns: number;
  } {
    const results = this.db.getParkrunResults({ runnerName });
    // ... existing code ...
  }

  // Expose database queries for filters
  getResults(params?: {
    startDate?: string;
    endDate?: string;
    runnerName?: string;
    limit?: number;
    offset?: number;
  }): any[] {
    return this.db.getParkrunResults(params);
  }

  countResults(params?: { startDate?: string; endDate?: string; runnerName?: string }): number {
    return this.db.countParkrunResults(params?.startDate, params?.endDate, params?.runnerName);
  }

  // Get underlying database instance (for direct access if needed)
  getDB(): DatabaseService {
    return this.db;
  }

  private parseTimeToSeconds(timeStr: string): number {
    // ... existing code ...
  }

  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  private secondsToTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

let parkrunServiceInstance: ParkrunService | null = null;

export function getParkrunService(config: AppConfig): ParkrunService {
  if (!parkrunServiceInstance) {
    parkrunServiceInstance = new ParkrunService(config);
  }
  return parkrunServiceInstance;
}
