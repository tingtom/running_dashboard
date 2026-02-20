import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

import { loadConfig, AppConfig } from './config/config.service';
import { initializeDatabase, getDatabase } from './services/database.service';
import { getStravaService } from './services/strava.service';
import { getParkrunService } from './services/parkrun.service';
import { getRecommendationService } from './services/recommendation.service';

import runsRouter from './api/routes/runs';
import stravaRouter from './api/routes/strava';
import parkrunRouter from './api/routes/parkrun';
import statsRouter from './api/routes/stats';
import recommendationsRouter from './api/routes/recommendations';

// Load configuration
const config: AppConfig = loadConfig();

// Initialize database
initializeDatabase(config);

// Get database instance
const db = getDatabase(config);

// Create Express app
const app: Application = express();
const PORT = config.server.port;
const HOST = config.server.host;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make config and db available to routes
app.locals.config = config;
app.locals.db = getDatabase(config);
app.locals.recommendationService = new (require('./services/recommendation.service').RecommendationService)(db, config);

// API Routes
app.use('/api/runs', runsRouter);
app.use('/api/strava', stravaRouter);
app.use('/api/parkrun', parkrunRouter);
app.use('/api/stats', statsRouter);
app.use('/api/recommendations', require('./api/routes/recommendations').default);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../public');
  app.use(express.static(frontendPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - Error:`, err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Setup logger
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json'
    ? winston.format.json()
    : winston.format.simple(),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.max_size_mb * 1024 * 1024,
      maxFiles: config.logging.max_files
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.max_size_mb * 1024 * 1024,
      maxFiles: config.logging.max_files
    })
  ]
});

// Also log to console in dev
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Scheduled tasks
function scheduleTasks(): void {
  // Strava polling
  if (config.strava.client_id && config.strava.client_secret) {
    const stravaPollCron = `0 */${config.strava.poll_interval_hours} * * *`; // Every N hours
    cron.schedule(stravaPollCron, async () => {
      try {
        logger.info('Starting Strava poll');
        const stravaService = getStravaService(config);
        const result = await stravaService.pollActivities();
        logger.info('Strava poll completed', { found: result.found, added: result.added, errors: result.errors });
      } catch (error: any) {
        logger.error('Strava poll failed', { error: error.message });
      }
    });
    logger.info(`Strava polling scheduled every ${config.strava.poll_interval_hours} hour(s)`);
  }

  // Parkrun scraping
  if (config.parkrun.enabled) {
    cron.schedule(config.parkrun.scrape_schedule, async () => {
      try {
        logger.info('Starting parkrun scrape');
        const parkrunService = getParkrunService(config);
        const result = await parkrunService.scrapeResults(config.parkrun.scrape_days_back);
        logger.info('Parkrun scrape completed', { eventsFound: result.eventsFound, resultsAdded: result.resultsAdded, errors: result.errors });
      } catch (error: any) {
        logger.error('Parkrun scrape failed', { error: error.message });
      }
    });
    logger.info(`Parkrun scraping scheduled: ${config.parkrun.scrape_schedule}`);
  }

  // Data retention cleanup
  if (config.retention.auto_cleanup) {
    cron.schedule(config.retention.cleanup_schedule, () => {
      try {
        logger.info('Starting data cleanup');
        const db = getDatabase(config);
        const deleted = db.cleanupOldRuns(config.retention.keep_years);
        logger.info(`Data cleanup completed: ${deleted} old runs deleted`);
      } catch (error: any) {
        logger.error('Data cleanup failed', { error: error.message });
      }
    });
    logger.info(`Data cleanup scheduled: ${config.retention.cleanup_schedule}`);
  }
}

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  scheduleTasks();

  // Initial Strava sync after 10 seconds (if tokens exist)
  setTimeout(async () => {
    try {
      if (config.strava.refresh_token) {
        logger.info('Triggering initial Strava sync');
        const stravaService = getStravaService(config);
        const result = await stravaService.pollActivities();
        logger.info('Initial Strava sync completed', { added: result.added });
      }
    } catch (error: any) {
      logger.error('Initial Strava sync failed', { error: error.message });
      // Don't crash the server
    }
  }, 10000);
});

export { app, logger };
