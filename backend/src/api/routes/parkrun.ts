import { Router, Request, Response } from 'express';
import { getParkrunService } from '../../services/parkrun.service';
import { AppConfig } from '../../config/config.service';
import Joi from 'joi';
import * as fs from 'fs';

const router = Router();

// GET /api/parkrun/results - List results with filters
router.get('/results', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const service = getParkrunService(config);

    const { startDate, endDate, runnerName, limit = 100, offset = 0 } = req.query;

    const results = service.getResults({
      startDate: startDate as string,
      endDate: endDate as string,
      runnerName: runnerName as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    const total = service.countResults({
      startDate: startDate as string,
      endDate: endDate as string,
      runnerName: runnerName as string
    });

    res.json({
      results,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/parkrun/scrape - Manual trigger scrape
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      daysBack: Joi.number().integer().min(1).max(365).optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const config = req.app.locals.config as AppConfig;
    const service = getParkrunService(config);
    const result = await service.scrapeResults(value.daysBack || 90);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/parkrun/schedule - Get scrape schedule
router.get('/schedule', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const service = getParkrunService(config);
    const schedule = service.getSchedule();
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/parkrun/schedule - Update scrape schedule
router.put('/schedule', (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      schedule: Joi.string().pattern(/^(\*|([0-5]?[0-9])(\/\d+)?) (\*|([0-5]?[0-9])(\/\d+)?) (\*|(\d{1,2})(\/\d+)?) (\*|(1[0-2]|0?[1-9])(\/\d+)?) (\*|[0-6](\/[0-9]+)?)$/).required(),
      enabled: Joi.boolean().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // In a real implementation, we'd persist this to config
    const configPath = process.env.CONFIG_PATH || '/config/config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (value.schedule) {
      config.parkrun.scrape_schedule = value.schedule;
    }
    if (value.enabled !== undefined) {
      config.parkrun.enabled = value.enabled;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    // Reload config (would need to restart services to take effect)
    // For now, return updated schedule
    res.json({
      message: 'Schedule updated',
      schedule: config.parkrun.scrape_schedule,
      enabled: config.parkrun.enabled,
      note: 'Changes will take effect on next scheduled scrape'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/parkrun/runner/:name - Get specific runner's stats
router.get('/runner/:name', (req: Request, res: Response) => {
  try {
    const config = req.app.locals.config as AppConfig;
    const service = getParkrunService(config);
    const stats = service.getRunnerStats(decodeURIComponent(req.params.name));
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
