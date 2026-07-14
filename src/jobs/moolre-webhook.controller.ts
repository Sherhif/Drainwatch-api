import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { JobsService } from './jobs.service';

@Controller('webhooks/moolre')
export class MoolreWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handle(
    @Headers('x-moolre-webhook-secret') secret: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    this.assertWebhookSecret(secret);
    return this.jobsService.reconcileMoolreWebhook(payload);
  }

  private assertWebhookSecret(secret: string | undefined) {
    const expected = this.configService.get<string>('moolre.webhookSecret');

    if (!expected) {
      return;
    }

    const received = Buffer.from(secret ?? '');
    const configured = Buffer.from(expected);

    if (
      received.length !== configured.length ||
      !timingSafeEqual(received, configured)
    ) {
      throw new UnauthorizedException('Invalid Moolre webhook secret');
    }
  }
}
