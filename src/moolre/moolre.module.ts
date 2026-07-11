import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MoolreService } from './moolre.service';

@Module({
  imports: [ConfigModule],
  providers: [MoolreService],
  exports: [MoolreService],
})
export class MoolreModule {}
