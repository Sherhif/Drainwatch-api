import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ForbiddenException } from '@nestjs/common';
import { DemoService } from './demo.service';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly configService: ConfigService,
    private readonly demoService: DemoService,
  ) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Seed deterministic demo users and jobs.' })
  async seed() {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      throw new ForbiddenException('Demo seeding is disabled in production');
    }

    return this.demoService.seed();
  }
}
