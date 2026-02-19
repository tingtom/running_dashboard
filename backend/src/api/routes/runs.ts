import { Router, Request, Response } from 'express';
import { DatabaseService, getDatabase } from '../services/database.service';
import { Run } from '../models/database.types';
import multer from 'multer';
import GPXParser from 'gpxparser';
import { tcxParser } from 'tcxparser';
import * as fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/runs - List runs with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase(req.app.locals.config);
    const {
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      sortBy = 'start_date',
      sortOrder = 'desc'
    } = req.query;

    const runs = db.getRuns({
      startDate: startDate as string,
      endDate: endDate as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    const total = db.countRuns(startDate as string, endDate as string);

    res.json({
      runs: runs.map(run => ({
        ...run,
        // Convert polyline only if exists - frontend will decode
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      has_more: parseInt(offset as string) + runs.length < total
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/runs/:id - Get single run
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase(req.app.locals.config);
    const run = db.getRun(parseInt(req.params.id));
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/runs/upload - Upload GPX/TCX file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const name = req.body.name as string || `Uploaded Run ${new Date().toLocaleDateString()}`;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let newRunData: any = null;

    if (fileExt === '.gpx') {
      newRunData = parseGPX(req.file.buffer.toString(), name);
    } else if (fileExt === '.tcx') {
      newRunData = parseTCX(req.file.buffer.toString(), name);
    } else {
      return res.status(422).json({ error: 'Unsupported file format. Use GPX or TCX.' });
    }

    if (!newRunData) {
      return res.status(422).json({ error: 'Failed to parse file. Invalid format.' });
    }

    const db = getDatabase(req.app.locals.config);
    const runId = db.insertRun(newRunData);
    const run = db.getRun(runId);

    res.status(201).json({
      id: runId,
      name,
      message: 'Run uploaded successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/runs/:id - Delete run
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase(req.app.locals.config);
    const id = parseInt(req.params.id);
    const deleted = db.deleteRun(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ message: 'Run deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/runs/stats - Run statistics
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase(req.app.locals.config);
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const stats = db.getRunStats(days);

    res.json({
      total_runs: stats.total_runs,
      total_distance: stats.total_distance,
      total_distance_km: Math.round(stats.total_distance / 10) / 100, // Convert to km
      total_time: stats.total_time,
      total_time_hours: Math.round((stats.total_time / 3600) * 10) / 10,
      average_distance_per_run: Math.round(stats.average_distance),
      average_pace: formatPace(stats.average_pace_seconds),
      average_speed_kmh: Math.round(stats.average_speed_kmh * 10) / 10,
      longest_run: Math.round(stats.longest_run),
      most_frequent_day: stats.most_frequent_day
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function parseGPX(gpxString: string, name: string): any {
  try {
    const gpx = new GPXParser(gpxString);
    const track = gpx.tracks[0];

    if (!track || !track.segments[0] || track.segments[0].points.length === 0) {
      return null;
    }

    const points = track.segments[0].points;
    const startPoint = points[0];
    const endPoint = points[points.length - 1];

    // Calculate total distance and moving time approximations
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += points[i].distanceFromPrevious || 0;
    }

    // Moving time - sum of time gaps
    const elapsedTime = points.length > 1
      ? (points[points.length - 1].time.getTime() - points[0].time.getTime()) / 1000
      : 0;

    // Average speed
    const avgSpeed = totalDistance / elapsedTime;

    return {
      strava_id: null,
      name,
      distance: totalDistance,
      moving_time: elapsedTime,
      elapsed_time: elapsedTime,
      start_date: startPoint.time.toISOString(),
      start_date_local: startPoint.time.toISOString().replace('Z', ''),
      type: 'Run',
      upload_id: null,
      average_speed: avgSpeed,
      max_speed: avgSpeed,
      average_heartrate: null,
      max_heartrate: null,
      total_elevation_gain: 0, // Could compute from elevation data
      elev_high: null,
      elev_low: null,
      location_country: null,
      location_state: null,
      location_city: null,
      latitude_start: startPoint.lat,
      longitude_start: startPoint.lon,
      latitude_end: endPoint.lat,
      longitude_end: endPoint.lon,
      polyline: null // Would need to encode points to polyline
    };
  } catch (error) {
    console.error('GPX parse error:', error);
    return null;
  }
}

function parseTCX(tcxString: string, name: string): any {
  // Similar implementation for TCX, using tcxParser library
  // For now, return null - would implement in production
  console.warn('TCX parsing not yet implemented');
  return null;
}

function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return 'N/A';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default router;
