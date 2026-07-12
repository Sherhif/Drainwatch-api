import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnvironment } from './config/env.validation';
import moolreConfig from './config/moolre.config';
import { DemoModule } from './demo/demo.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, moolreConfig],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        ...(configService.get<string>('database.url')
          ? { url: configService.get<string>('database.url') }
          : {
              host: configService.getOrThrow<string>('database.host'),
              port: configService.getOrThrow<number>('database.port'),
              username: configService.getOrThrow<string>('database.username'),
              password: configService.getOrThrow<string>('database.password'),
              database: configService.getOrThrow<string>('database.name'),
            }),
        autoLoadEntities: true,
        synchronize: configService.getOrThrow<boolean>(
          'database.synchronize',
        ),
        migrations: [`${__dirname}/database/migrations/*{.ts,.js}`],
        migrationsRun: configService.get<boolean>('database.migrationsRun'),
        ssl: configService.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    AuthModule,
    DemoModule,
    HealthModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
