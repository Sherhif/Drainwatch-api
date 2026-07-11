import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  name: process.env.APP_NAME ?? 'DrainWatch API',
  version: process.env.APP_VERSION ?? '0.0.1',
}));
