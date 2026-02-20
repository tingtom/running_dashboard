import { Router } from 'express';
import { getDatabase } from '../services/database.service';
import { getRecommendationService } from '../services/recommendation.service';

const router = Router();

interface CalendarEvent {
  id: string;
  date: string;
  type: 'run' | 'parkrun' | 'recommendation' | 'custom';
  title: string;
  distance_km?: number | null;
  duration_minutes?: number | null;
  notes?: string;
  source: string;
}

// GET /api/calendar/events?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/events', (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;

    const events: CalendarEvent[] = [];

    // 1. Runs
    const runs = db.getRuns({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      sortBy: 'start_date_local',
      sortOrder: 'asc'
    });
    for (const run of runs) {
      const datePart = run.start_date_local.split('T')[0];
      const distanceKm = parseFloat((run.distance / 1000).toFixed(2));
      let paceStr = 'N/A';
      if (run.distance > 0 && run.moving_time > 0) {
        const paceSecPerKm = run.moving_time / (run.distance / 1000);
        const paceMin = Math.floor(paceSecPerKm / 60);
        const paceSec = Math.round(paceSecPerKm % 60);
        paceStr = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
      }
      events.push({
        id: `run_${run.id}`,
        date: datePart,
        type: 'run',
        title: run.name,
        distance_km: distanceKm,
        duration_minutes: Math.round(run.moving_time / 60),
        notes: `Avg pace: ${paceStr}/km`,
        source: 'strava'
      });
    }

    // 2. Parkrun results
    const parkrunResults = db.getParkrunResults({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    });
    for (const pr of parkrunResults) {
      const datePart = pr.parkrun_date.split('T')[0];
      // Parse finish_time (HH:MM:SS or MM:SS) to minutes
      const parts = pr.finish_time.split(':').map(Number);
      let minutes = 0;
      if (parts.length === 3) {
        minutes = parts[0] * 60 + parts[1] + parts[2] / 60;
      } else if (parts.length === 2) {
        minutes = parts[0] + parts[1] / 60;
      }
      events.push({
        id: `parkrun_${pr.id}`,
        date: datePart,
        type: 'parkrun',
        title: `Parkrun - ${pr.runner_name}`,
        distance_km: 5.0,
        duration_minutes: Math.round(minutes),
        notes: `Position: ${pr.position}/${pr.total_runners}`,
        source: 'parkrun'
      });
    }

    // 3. Recommendations
    try {
      const recService = getRecommendationService();
      if (recService) {
        // Determine weeks needed to cover the date range
        const sd = startDate ? new Date(startDate as string) : new Date();
        const ed = endDate ? new Date(endDate as string) : new Date();
        // Ensure inclusive range
        sd.setHours(0,0,0,0);
        ed.setHours(23,59,59,999);
        const diffDays = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24));
        const weeksNeeded = Math.max(4, Math.ceil(diffDays / 7) + 2); // add buffer

        const recResponse = recService.generate(weeksNeeded, undefined);
        for (const week of recResponse.recommendations) {
          for (const run of week.runs) {
            const runDate = new Date(run.date);
            if (runDate >= sd && runDate <= ed) {
              events.push({
                id: `rec_${week.weekStart}_${run.date}`,
                date: run.date,
                type: 'recommendation',
                title: `${run.type.charAt(0).toUpperCase() + run.type.slice(1)} - ${run.notes}`,
                distance_km: run.distance ? parseFloat((run.distance / 1000).toFixed(2)) : null,
                duration_minutes: run.duration ? Math.round(run.duration / 60) : null,
                notes: run.notes,
                source: 'recommendation'
              });
            }
          }
        }
      }
    } catch (e) {
      // Recommendation service may not be initialized; ignore
    }

    // 4. Custom events
    const customEvents = db.getCustomEvents({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      sortBy: 'date',
      sortOrder: 'asc'
    });
    for (const ce of customEvents) {
      events.push({
        id: `custom_${ce.id}`,
        date: ce.date,
        type: 'custom',
        title: ce.title,
        distance_km: null,
        duration_minutes: null,
        notes: ce.description || undefined,
        source: 'custom'
      });
    }

    // Sort all events by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ events });
  } catch (error: any) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

