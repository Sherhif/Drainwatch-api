import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      service: this.configService.getOrThrow<string>('app.name'),
      version: this.configService.getOrThrow<string>('app.version'),
      environment: this.configService.getOrThrow<string>('app.nodeEnv'),
    };
  }
}
