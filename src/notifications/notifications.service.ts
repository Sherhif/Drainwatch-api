import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../jobs/enums/job-status.enum';
import { MoolreService } from '../moolre/moolre.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { NotificationEvent } from './enums/notification-event.enum';
import { SmsLog } from './types/sms-log.type';

@Injectable()
export class NotificationsService {
  private readonly smsLogs: SmsLog[] = [];

  constructor(
    private readonly moolreService: MoolreService,
    private readonly usersService: UsersService,
  ) {}

  async notifyJobTransition(job: Job, toStatus: JobStatus) {
    if (toStatus === JobStatus.Funded) {
      await this.notifyWorkers(
        NotificationEvent.JobFunded,
        `New funded DrainWatch job available near you: ${job.id}`,
      );
    }

    if (toStatus === JobStatus.Claimed) {
      await this.notifyUserById(
        job.sponsorId,
        NotificationEvent.JobClaimed,
        `Your DrainWatch job has been claimed by a verified worker: ${job.id}`,
      );
    }

    if (toStatus === JobStatus.CompletedPendingReview) {
      await this.notifyUserById(
        job.sponsorId,
        NotificationEvent.JobCompleted,
        `DrainWatch job marked complete. Review within 48 hours: ${job.id}`,
      );
    }

    if (toStatus === JobStatus.Paid) {
      await this.notifyUserById(
        job.workerId,
        NotificationEvent.JobApprovedPaid,
        `Payment released for DrainWatch job: ${job.id}`,
      );
    }

    if (toStatus === JobStatus.Disputed) {
      await this.notifyUserById(
        job.workerId,
        NotificationEvent.JobDisputed,
        `A sponsor disputed DrainWatch job completion: ${job.id}`,
      );
      await this.notifyAdmins(
        NotificationEvent.JobDisputed,
        `DrainWatch dispute opened for job: ${job.id}`,
      );
    }
  }

  async notifyDisputeResolved(job: Job, finalStatus: JobStatus) {
    const message = `DrainWatch dispute resolved for job ${job.id}: ${finalStatus}`;

    await Promise.all([
      this.notifyUserById(
        job.sponsorId,
        NotificationEvent.DisputeResolved,
        message,
      ),
      this.notifyUserById(
        job.workerId,
        NotificationEvent.DisputeResolved,
        message,
      ),
    ]);
  }

  getLogs() {
    return [...this.smsLogs];
  }

  private async notifyWorkers(event: NotificationEvent, message: string) {
    const workers = await this.usersService.findByRole(UserRole.Worker);
    await Promise.all(
      workers.map((worker) => this.sendSms(worker, event, message)),
    );
  }

  private async notifyAdmins(event: NotificationEvent, message: string) {
    const admins = await this.usersService.findByRole(UserRole.Admin);
    await Promise.all(
      admins.map((admin) => this.sendSms(admin, event, message)),
    );
  }

  private async notifyUserById(
    userId: string | null | undefined,
    event: NotificationEvent,
    message: string,
  ) {
    if (!userId) {
      return;
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      return;
    }

    await this.sendSms(user, event, message);
  }

  private async sendSms(user: User, event: NotificationEvent, message: string) {
    const log: SmsLog = {
      id: randomUUID(),
      event,
      recipient_user_id: user.id,
      phone_number: user.phoneNumber,
      message,
      status: 'logged',
      provider_reference: null,
      raw_response: null,
      created_at: new Date(),
    };

    try {
      const result = await this.moolreService.sendSms({
        phoneNumber: user.phoneNumber,
        message,
        idempotencyKey: `sms:${event}:${user.id}:${Date.now()}`,
      });
      log.status = result.status === 'success' ? 'sent' : 'failed';
      log.provider_reference = result.reference;
      log.raw_response = result.rawResponse;
    } catch (error) {
      log.status = 'failed';
      log.raw_response = {
        message: error instanceof Error ? error.message : String(error),
      };
    }

    this.smsLogs.push(log);
    return log;
  }
}
