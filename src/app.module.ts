import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig],
      validate: validateEnvironment,
    }),
    AuthModule,
    HealthModule,
    JobsModule,
  ],
})
export class AppModule {}
