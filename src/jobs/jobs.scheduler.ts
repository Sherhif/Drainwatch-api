import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(private readonly jobsService: JobsService) {}

  @Interval(60_000)
  async autoApproveDueJobs() {
    try {
      await this.jobsService.autoApproveDueJobs();
    } catch (error) {
      this.logger.error(
        'Unable to process automatic job approvals',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Interval(60_000)
  async reconcilePendingTransactions() {
    try {
      await this.jobsService.reconcilePendingTransactions();
    } catch (error) {
      this.logger.error(
        'Unable to reconcile pending Moolre transactions',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
