import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsScheduler {
  constructor(private readonly jobsService: JobsService) {}

  @Interval(60_000)
  async autoApproveDueJobs() {
    await this.jobsService.autoApproveDueJobs();
  }
}
