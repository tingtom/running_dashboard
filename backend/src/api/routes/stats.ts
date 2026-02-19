import { Router, Request, Response } from 'express';
import { getStatsService } from '../../services/stats.service';
import { AppConfig } from '../../config/config.service';

const router = Router();

// GET /api/stats/summary
router.get('/summary', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const summary = statsService.getSummary(days);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/progress
router.get('/progress', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const period = req.query.period as 'weekly' | 'monthly' || 'weekly';
    const progress = statsService.getPaceProgress(period);
    res.json({ period, data: progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/by-location
router.get('/by-location', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const radius = req.query.radius_meters ? parseInt(req.query.radius_meters as string) : 1000;
    const locations = statsService.getByLocation(radius);
    res.json({ locations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/consistency
router.get('/consistency', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const consistency = statsService.getConsistency(days);
    res.json(consistency);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/personal-records
router.get('/personal-records', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const records = statsService.getPersonalRecords();
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/predict-5k
router.get('/predict-5k', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const prediction = statsService.predict5KTime();
    if (!prediction) {
      return res.status(404).json({ error: 'Not enough recent run data to predict 5K time' });
    }
    res.json(prediction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/weekly-distance
router.get('/weekly-distance', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const statsService = getStatsService(config);
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 12;
    const data = statsService.getWeeklyDistance(weeks);
    res.json({ period: 'weekly', data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
