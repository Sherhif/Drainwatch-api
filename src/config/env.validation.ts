type Environment = {
  NODE_ENV?: string;
  PORT?: string;
  API_PREFIX?: string;
  APP_NAME?: string;
  APP_VERSION?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
};

const allowedNodeEnvs = ['development', 'test', 'staging', 'production'];

export function validateEnvironment(config: Environment) {
  const errors: string[] = [];
  const nodeEnv = config.NODE_ENV ?? 'development';
  const port = Number(config.PORT ?? 3000);
  const apiPrefix = config.API_PREFIX ?? 'api/v1';
  const jwtSecret = config.JWT_SECRET ?? 'dev-only-change-me';
  const jwtExpiresIn = config.JWT_EXPIRES_IN ?? '1d';

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
  };
}
