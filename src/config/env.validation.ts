type Environment = {
  NODE_ENV?: string;
  PORT?: string;
  API_PREFIX?: string;
  APP_NAME?: string;
  APP_VERSION?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  DB_SSL?: string;
  DB_SYNCHRONIZE?: string;
  DB_MIGRATIONS_RUN?: string;
  MOOLRE_MODE?: string;
  MOOLRE_BASE_URL?: string;
  MOOLRE_API_USER?: string;
  MOOLRE_API_KEY?: string;
  MOOLRE_API_PUBKEY?: string;
  MOOLRE_API_VASKEY?: string;
  MOOLRE_SMS_SENDER_ID?: string;
};

const allowedNodeEnvs = ['development', 'test', 'staging', 'production'];
const allowedMoolreModes = ['stub', 'live'];
const allowedBooleanStrings = ['true', 'false'];

export function validateEnvironment(config: Environment) {
  const errors: string[] = [];
  const nodeEnv = config.NODE_ENV ?? 'development';
  const port = Number(config.PORT ?? 3000);
  const apiPrefix = config.API_PREFIX ?? 'api/v1';
  const jwtSecret = config.JWT_SECRET ?? 'dev-only-change-me';
  const jwtExpiresIn = config.JWT_EXPIRES_IN ?? '1d';
  const dbPort = Number(config.DB_PORT ?? 5432);
  const dbSsl = config.DB_SSL ?? 'false';
  const dbSynchronize = config.DB_SYNCHRONIZE ?? 'true';
  const dbMigrationsRun = config.DB_MIGRATIONS_RUN ?? 'false';
  const moolreMode = config.MOOLRE_MODE ?? 'stub';

  if (!allowedNodeEnvs.includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${allowedNodeEnvs.join(', ')}`);
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid TCP port number');
  }

  if (!/^[a-z0-9]+(?:\/[a-z0-9._-]+)*$/i.test(apiPrefix)) {
    errors.push('API_PREFIX must be a URL path without a leading slash');
  }

  if (nodeEnv === 'production' && jwtSecret === 'dev-only-change-me') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (!config.DATABASE_URL) {
    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
      errors.push('DB_PORT must be a valid TCP port number');
    }

    if (!config.DB_HOST && nodeEnv === 'production') {
      errors.push('DB_HOST is required in production when DATABASE_URL is not set');
    }

    if (!config.DB_USERNAME && nodeEnv === 'production') {
      errors.push(
        'DB_USERNAME is required in production when DATABASE_URL is not set',
      );
    }

    if (!config.DB_NAME && nodeEnv === 'production') {
      errors.push('DB_NAME is required in production when DATABASE_URL is not set');
    }
  }

  if (!allowedBooleanStrings.includes(dbSsl)) {
    errors.push('DB_SSL must be true or false');
  }

  if (!allowedBooleanStrings.includes(dbSynchronize)) {
    errors.push('DB_SYNCHRONIZE must be true or false');
  }

  if (!allowedBooleanStrings.includes(dbMigrationsRun)) {
    errors.push('DB_MIGRATIONS_RUN must be true or false');
  }

  if (nodeEnv === 'production' && dbSynchronize === 'true') {
    errors.push('DB_SYNCHRONIZE must be false in production');
  }

  if (nodeEnv === 'production' && moolreMode !== 'live') {
    errors.push('MOOLRE_MODE must be live in production');
  }

  if (!allowedMoolreModes.includes(moolreMode)) {
    errors.push(`MOOLRE_MODE must be one of: ${allowedMoolreModes.join(', ')}`);
  }

  if (moolreMode === 'live') {
    if (!config.MOOLRE_BASE_URL) {
      errors.push('MOOLRE_BASE_URL is required when MOOLRE_MODE=live');
    }

    if (!config.MOOLRE_API_USER || !config.MOOLRE_API_KEY) {
      errors.push(
        'MOOLRE_API_USER and MOOLRE_API_KEY are required when MOOLRE_MODE=live',
      );
    }

    if (!config.MOOLRE_SMS_SENDER_ID) {
      errors.push('MOOLRE_SMS_SENDER_ID is required when MOOLRE_MODE=live');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: String(port),
    API_PREFIX: apiPrefix,
    APP_NAME: config.APP_NAME ?? 'DrainWatch API',
    APP_VERSION: config.APP_VERSION ?? '0.0.1',
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    DB_PORT: String(dbPort),
    DB_SSL: dbSsl,
    DB_SYNCHRONIZE: dbSynchronize,
    DB_MIGRATIONS_RUN: dbMigrationsRun,
    MOOLRE_MODE: moolreMode,
  };
}
