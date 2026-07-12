import { registerAs } from '@nestjs/config';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

function parseCorsOrigins(value: string | undefined) {
  if (!value) {
    return defaultCorsOrigins;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  name: process.env.APP_NAME ?? 'DrainWatch API',
  version: process.env.APP_VERSION ?? '0.0.1',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}));
