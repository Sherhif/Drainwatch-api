import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MoolreModule } from '../moolre/moolre.module';
import { EscrowService } from './escrow.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [AuthModule, MoolreModule],
  controllers: [JobsController],
  providers: [EscrowService, JobsService],
})
export class JobsModule {}
