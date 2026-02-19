import fs from 'fs';
import path from 'path';
import Joi from 'joi';

export interface StravaConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string;
  refresh_token: string;
  access_token: string;
  token_expires_at: number | null;
  poll_interval_hours: number;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface DatabaseConfig {
  path: string;
  backup_path: string;
}

export interface ParkrunConfig {
  base_url: string;
  scrape_schedule: string;
  scrape_days_back: number;
  enabled: boolean;
}

export interface LoggingConfig {
  level: string;
  file: string;
  max_size_mb: number;
  max_files: number;
  format: string;
}

export interface RetentionConfig {
  keep_years: number;
  auto_cleanup: boolean;
  cleanup_schedule: string;
}

export interface FrontendConfig {
  url: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  strava: StravaConfig;
  parkrun: ParkrunConfig;
  logging: LoggingConfig;
  retention: RetentionConfig;
  frontend: FrontendConfig;
}

const configSchema: Joi.ObjectSchema<AppConfig> = Joi.object({
  server: Joi.object({
    port: Joi.number().port().required().default(3001),
    host: Joi.string().required().default('0.0.0.0')
  }).required(),
  database: Joi.object({
    path: Joi.string().required(),
    backup_path: Joi.string().required()
  }).required(),
  strava: Joi.object({
    client_id: Joi.string().required(),
    client_secret: Joi.string().required(),
    redirect_uri: Joi.string().required(),
    scopes: Joi.string().required(),
    refresh_token: Joi.string().allow('').default(''),
    access_token: Joi.string().allow('').default(''),
    token_expires_at: Joi.number().allow(null).default(null),
    poll_interval_hours: Joi.number().integer().min(1).default(6)
  }).required(),
  parkrun: Joi.object({
    base_url: Joi.string().required(),
    scrape_schedule: Joi.string().required(),
    scrape_days_back: Joi.number().integer().min(1).default(90),
    enabled: Joi.boolean().default(true)
  }).required(),
  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
    file: Joi.string().required(),
    max_size_mb: Joi.number().integer().min(1).default(10),
    max_files: Joi.number().integer().min(1).default(5),
    format: Joi.string().valid('json', 'simple').default('json')
  }).required(),
  retention: Joi.object({
    keep_years: Joi.number().integer().min(0).default(1),
    auto_cleanup: Joi.boolean().default(true),
    cleanup_schedule: Joi.string().required()
  }).required(),
  frontend: Joi.object({
    url: Joi.string().required()
  }).required()
});

export function loadConfig(configPath: string = process.env.CONFIG_PATH || '/config/config.json'): AppConfig {
  // Ensure config file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}. Copy config.json.example to config.json and fill it out.`);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(rawConfig);

  const { error, value } = configSchema.validate(config, { abortEarly: false });
  if (error) {
    const errors = error.details.map(d => d.message).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }

  return value;
}

export function saveConfigPartial(configPath: string, partial: Partial<AppConfig>): void {
  const currentConfig = loadConfig(configPath);
  const mergedConfig = deepMerge(currentConfig, partial);

  const { error } = configSchema.validate(mergedConfig);
  if (error) {
    throw new Error(`Invalid configuration update: ${error.details[0].message}`);
  }

  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2) + '\n');
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key] as any);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}
