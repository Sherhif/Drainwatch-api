import { Module } from '@nestjs/common';
import { AdminDisputesController } from '../admin/admin-disputes.controller';
import { AuthModule } from '../auth/auth.module';
import { MoolreModule } from '../moolre/moolre.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EscrowService } from './escrow.service';
import { JobsScheduler } from './jobs.scheduler';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PhotoValidationService } from './photo-validation.service';

@Module({
  imports: [AuthModule, MoolreModule, NotificationsModule],
  controllers: [AdminDisputesController, JobsController],
  providers: [
    EscrowService,
    JobsScheduler,
    JobsService,
    PhotoValidationService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
