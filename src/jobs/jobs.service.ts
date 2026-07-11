import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserRole } from '../users/enums/user-role.enum';
import { CompleteJobDto } from './dto/complete-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { DisputeJobDto } from './dto/dispute-job.dto';
import { FundJobDto } from './dto/fund-job.dto';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';
import { Dispute } from './entities/dispute.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { Job } from './entities/job.entity';
import { Transaction } from './entities/transaction.entity';
import { JobStatus } from './enums/job-status.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransactionType } from './enums/transaction-type.enum';

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, Job>();
  private readonly statusHistory = new Map<string, JobStatusHistory[]>();
  private readonly transactions = new Map<string, Transaction[]>();
  private readonly disputes = new Map<string, Dispute>();

  create(
    createJobDto: CreateJobDto,
    currentUser: JwtUser,
    reportPhoto?: { originalname?: string },
  ) {
    const reportPhotoUrl =
      createJobDto.report_photo_url ?? this.createReportPhotoStub(reportPhoto);

    if (!reportPhotoUrl) {
      throw new BadRequestException('A report photo is required');
    }

    const now = new Date();
    const job = new Job();
    job.id = randomUUID();
    job.reporterId = currentUser.sub;
    job.workerId = null;
    job.sponsorId = null;
    job.status = JobStatus.Open;
    job.severity = createJobDto.severity;
    job.description = createJobDto.description ?? null;
    job.locationLat = createJobDto.lat;
    job.locationLng = createJobDto.lng;
    job.reportPhotoUrl = reportPhotoUrl;
    job.completionPhotoUrl = null;
    job.costAmount = null;
    job.currency = 'GHS';
    job.moolreCollectionRef = null;
    job.moolreDisbursementRef = null;
    job.disputeDeadline = null;
    job.createdAt = now;
    job.updatedAt = now;

    this.jobs.set(job.id, job);
    this.recordStatusHistory({
      jobId: job.id,
      fromStatus: null,
      toStatus: JobStatus.Open,
      changedBy: currentUser.sub,
      note: 'Job reported',
    });

    return job;
  }

  findAll(query: GetJobsQueryDto) {
    return [...this.jobs.values()]
      .filter((job) => (query.status ? job.status === query.status : true))
      .filter((job) =>
        query.severity ? job.severity === query.severity : true,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findOne(id: string) {
    const job = this.jobs.get(id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  getStatusHistory(jobId: string) {
    return this.statusHistory.get(jobId) ?? [];
  }

  getTransactions(jobId: string) {
    return this.transactions.get(jobId) ?? [];
  }

  getDispute(jobId: string) {
    return this.disputes.get(jobId) ?? null;
  }

  fund(id: string, fundJobDto: FundJobDto, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.Open]);

    const currency = fundJobDto.currency ?? 'GHS';
    const amount = fundJobDto.amount.toFixed(2);
    const collectionRef = `stub-collection-${randomUUID()}`;

    job.sponsorId = currentUser.sub;
    job.costAmount = amount;
    job.currency = currency;
    job.moolreCollectionRef = collectionRef;
    this.recordTransaction({
      jobId: job.id,
      type: TransactionType.Collection,
      amount,
      currency,
      moolreReference: collectionRef,
      rawResponse: {
        provider: 'stub',
        action: 'collection',
        message: 'Stubbed collection succeeded',
      },
    });
    this.transition(job, JobStatus.Funded, currentUser.sub, 'Job funded');

    return job;
  }

  claim(id: string, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.Funded]);

    job.workerId = currentUser.sub;
    this.transition(job, JobStatus.Claimed, currentUser.sub, 'Job claimed');

    return job;
  }

  start(id: string, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.Claimed]);
    this.assertAssignedWorker(job, currentUser);

    this.transition(
      job,
      JobStatus.InProgress,
      currentUser.sub,
      'Worker started job',
    );

    return job;
  }

  complete(
    id: string,
    completeJobDto: CompleteJobDto,
    currentUser: JwtUser,
    completionPhoto?: { originalname?: string },
  ) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.InProgress]);
    this.assertAssignedWorker(job, currentUser);

    const completionPhotoUrl =
      completeJobDto.completion_photo_url ??
      this.createCompletionPhotoStub(completionPhoto);

    if (!completionPhotoUrl) {
      throw new BadRequestException('A completion photo is required');
    }

    job.completionPhotoUrl = completionPhotoUrl;
    job.disputeDeadline = new Date(Date.now() + 48 * 60 * 60_000);
    this.transition(
      job,
      JobStatus.CompletedPendingReview,
      currentUser.sub,
      'Worker submitted completion proof',
    );

    return job;
  }

  approve(id: string, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.CompletedPendingReview]);
    this.assertSponsor(job, currentUser);

    this.transition(
      job,
      JobStatus.Approved,
      currentUser.sub,
      'Sponsor approved',
    );
    this.payWorker(
      job,
      currentUser.sub,
      'Stubbed payout after sponsor approval',
    );

    return job;
  }

  dispute(id: string, disputeJobDto: DisputeJobDto, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.CompletedPendingReview]);
    this.assertSponsor(job, currentUser);

    if (job.disputeDeadline && job.disputeDeadline.getTime() < Date.now()) {
      throw new BadRequestException('Dispute window has closed');
    }

    if (this.disputes.has(job.id)) {
      throw new BadRequestException('This job already has a dispute');
    }

    const now = new Date();
    const dispute = new Dispute();
    dispute.id = randomUUID();
    dispute.jobId = job.id;
    dispute.raisedBy = currentUser.sub;
    dispute.reason = disputeJobDto.reason;
    dispute.resolution = null;
    dispute.resolvedBy = null;
    dispute.note = null;
    dispute.createdAt = now;
    dispute.updatedAt = now;
    dispute.resolvedAt = null;

    this.disputes.set(job.id, dispute);
    this.transition(
      job,
      JobStatus.Disputed,
      currentUser.sub,
      'Sponsor disputed completion',
    );

    return job;
  }

  cancel(id: string, currentUser: JwtUser) {
    const job = this.findOne(id);
    this.assertCurrentStatus(job, [JobStatus.Open]);

    const isReporter = job.reporterId === currentUser.sub;
    const isAdmin = currentUser.roles.includes(UserRole.Admin);

    if (!isReporter && !isAdmin) {
      throw new ForbiddenException(
        'Only the reporter or an admin can cancel this job',
      );
    }

    this.transition(job, JobStatus.Cancelled, currentUser.sub, 'Job cancelled');

    return job;
  }

  private recordStatusHistory(input: {
    jobId: string;
    fromStatus?: JobStatus | null;
    toStatus: JobStatus;
    changedBy: string;
    note?: string;
  }) {
    const history = new JobStatusHistory();
    history.id = randomUUID();
    history.jobId = input.jobId;
    history.fromStatus = input.fromStatus ?? null;
    history.toStatus = input.toStatus;
    history.changedBy = input.changedBy;
    history.note = input.note ?? null;
    history.createdAt = new Date();

    const jobHistory = this.statusHistory.get(input.jobId) ?? [];
    jobHistory.push(history);
    this.statusHistory.set(input.jobId, jobHistory);

    return history;
  }

  private recordTransaction(input: {
    jobId: string;
    type: TransactionType;
    amount: string;
    currency: string;
    moolreReference: string;
    rawResponse: Record<string, unknown>;
  }) {
    const transaction = new Transaction();
    transaction.id = randomUUID();
    transaction.jobId = input.jobId;
    transaction.type = input.type;
    transaction.amount = input.amount;
    transaction.currency = input.currency;
    transaction.moolreReference = input.moolreReference;
    transaction.status = TransactionStatus.Success;
    transaction.rawResponse = input.rawResponse;
    transaction.createdAt = new Date();

    const jobTransactions = this.transactions.get(input.jobId) ?? [];
    jobTransactions.push(transaction);
    this.transactions.set(input.jobId, jobTransactions);

    return transaction;
  }

  private transition(
    job: Job,
    toStatus: JobStatus,
    changedBy: string,
    note: string,
  ) {
    const fromStatus = job.status;

    job.status = toStatus;
    job.updatedAt = new Date();
    this.recordStatusHistory({
      jobId: job.id,
      fromStatus,
      toStatus,
      changedBy,
      note,
    });
  }

  private payWorker(job: Job, changedBy: string, note: string) {
    if (!job.workerId) {
      throw new BadRequestException(
        'Cannot pay a job without an assigned worker',
      );
    }

    if (!job.costAmount) {
      throw new BadRequestException('Cannot pay a job without funded amount');
    }

    const disbursementRef = `stub-disbursement-${randomUUID()}`;
    job.moolreDisbursementRef = disbursementRef;
    this.recordTransaction({
      jobId: job.id,
      type: TransactionType.Disbursement,
      amount: job.costAmount,
      currency: job.currency,
      moolreReference: disbursementRef,
      rawResponse: {
        provider: 'stub',
        action: 'disbursement',
        worker_id: job.workerId,
        message: note,
      },
    });
    this.transition(job, JobStatus.Paid, changedBy, note);
  }

  private assertCurrentStatus(job: Job, allowedStatuses: JobStatus[]) {
    if (!allowedStatuses.includes(job.status)) {
      throw new BadRequestException(
        `Invalid job state transition from ${job.status}`,
      );
    }
  }

  private assertAssignedWorker(job: Job, currentUser: JwtUser) {
    if (job.workerId !== currentUser.sub) {
      throw new ForbiddenException(
        'Only the assigned worker can update this job',
      );
    }
  }

  private assertSponsor(job: Job, currentUser: JwtUser) {
    if (job.sponsorId !== currentUser.sub) {
      throw new ForbiddenException(
        'Only the funding sponsor can update this job',
      );
    }
  }

  private createReportPhotoStub(reportPhoto?: { originalname?: string }) {
    if (!reportPhoto) {
      return undefined;
    }

    const safeName = reportPhoto.originalname
      ? reportPhoto.originalname.replace(/[^a-z0-9._-]/gi, '-').toLowerCase()
      : 'report-photo.jpg';

    return `stub://report-photos/${randomUUID()}-${safeName}`;
  }

  private createCompletionPhotoStub(completionPhoto?: {
    originalname?: string;
  }) {
    if (!completionPhoto) {
      return undefined;
    }

    const safeName = completionPhoto.originalname
      ? completionPhoto.originalname
          .replace(/[^a-z0-9._-]/gi, '-')
          .toLowerCase()
      : 'completion-photo.jpg';

    return `stub://completion-photos/${randomUUID()}-${safeName}`;
  }
}
