import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDisputesController } from '../admin/admin-disputes.controller';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MoolreModule } from '../moolre/moolre.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { Dispute } from './entities/dispute.entity';
import { EscrowLiability } from './entities/escrow-liability.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { Job } from './entities/job.entity';
import { Transaction } from './entities/transaction.entity';
import { EscrowService } from './escrow.service';
import { JobsScheduler } from './jobs.scheduler';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { MoolreWebhookController } from './moolre-webhook.controller';
import { PhotoValidationService } from './photo-validation.service';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    MoolreModule,
    NotificationsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Dispute,
      EscrowLiability,
      Job,
      JobStatusHistory,
      Transaction,
    ]),
  ],
  controllers: [
    AdminDisputesController,
    JobsController,
    MoolreWebhookController,
  ],
  providers: [
    EscrowService,
    JobsScheduler,
    JobsService,
    PhotoValidationService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
