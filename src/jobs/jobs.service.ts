import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtUser } from '../auth/types/jwt-user.type';
import { MoolreService } from '../moolre/moolre.service';
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
import { EscrowService } from './escrow.service';

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, Job>();
  private readonly statusHistory = new Map<string, JobStatusHistory[]>();
  private readonly transactions = new Map<string, Transaction[]>();
  private readonly disputes = new Map<string, Dispute>();
  private readonly jobLocks = new Set<string>();

  constructor(
    private readonly escrowService: EscrowService,
    private readonly moolreService: MoolreService,
  ) {}

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

  findAll(query: GetJobsQueryDto, currentUser?: JwtUser) {
    this.assertNearbyQueryIsComplete(query);

    const nearLat = query.near_lat;
    const nearLng = query.near_lng;
    const radius = query.radius;
    const shouldFilterByDistance =
      nearLat !== undefined && nearLng !== undefined && radius !== undefined;

    const sponsorId = this.resolveUserFilter(query.sponsor_id, currentUser);
    const workerId = this.resolveUserFilter(query.worker_id, currentUser);
    const reporterId = this.resolveUserFilter(query.reporter_id, currentUser);

    const jobs = [...this.jobs.values()]
      .filter((job) => (query.status ? job.status === query.status : true))
      .filter((job) =>
        query.severity ? job.severity === query.severity : true,
      )
      .filter((job) => (sponsorId ? job.sponsorId === sponsorId : true))
      .filter((job) => (workerId ? job.workerId === workerId : true))
      .filter((job) => (reporterId ? job.reporterId === reporterId : true));

    if (!shouldFilterByDistance) {
      return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return jobs
      .map((job) => ({
        job,
        distanceKm: this.calculateDistanceKm(
          nearLat,
          nearLng,
          job.locationLat,
          job.locationLng,
        ),
      }))
      .filter(({ distanceKm }) => distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ job }) => job);
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
    return this.withJobLock(id, async () => {
      const job = this.findOne(id);

      if (job.moolreCollectionRef) {
        this.assertSponsor(job, currentUser);
        return job;
      }

      this.assertCurrentStatus(job, [JobStatus.Open]);

      const currency = fundJobDto.currency ?? 'GHS';
      const amount = fundJobDto.amount.toFixed(2);
      const idempotencyKey = this.createIdempotencyKey(job.id, 'collection');
      const collection = await this.moolreService.collect({
        jobId: job.id,
        sponsorId: currentUser.sub,
        amount,
        currency,
        idempotencyKey,
      });

      this.recordTransaction({
        jobId: job.id,
        type: TransactionType.Collection,
        amount,
        currency,
        moolreReference: collection.reference,
        idempotencyKey,
        status: collection.status,
        rawResponse: collection.rawResponse,
      });
      this.assertPaymentSucceeded(collection.status, 'collection');

      job.sponsorId = currentUser.sub;
      job.costAmount = amount;
      job.currency = currency;
      job.moolreCollectionRef = collection.reference;
      this.escrowService.hold({
        jobId: job.id,
        sponsorId: currentUser.sub,
        amount,
        currency,
      });
      this.transition(job, JobStatus.Funded, currentUser.sub, 'Job funded');

      return job;
    });
  }

  claim(id: string, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.Funded]);

      job.workerId = currentUser.sub;
      this.transition(job, JobStatus.Claimed, currentUser.sub, 'Job claimed');

      return job;
    });
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
    return this.withJobLock(id, async () => {
      const job = this.findOne(id);

      if (job.status === JobStatus.Paid && job.moolreDisbursementRef) {
        this.assertSponsor(job, currentUser);
        return job;
      }

      this.assertCurrentStatus(job, [JobStatus.CompletedPendingReview]);
      this.assertSponsor(job, currentUser);

      this.transition(
        job,
        JobStatus.Approved,
        currentUser.sub,
        'Sponsor approved',
      );
      await this.payWorker(
        job,
        currentUser.sub,
        'Payout after sponsor approval',
      );

      return job;
    });
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
    idempotencyKey: string;
    status: TransactionStatus;
    rawResponse: Record<string, unknown>;
  }) {
    const existingTransaction = this.findTransactionByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existingTransaction) {
      existingTransaction.moolreReference = input.moolreReference;
      existingTransaction.status = input.status;
      existingTransaction.rawResponse = input.rawResponse;
      return existingTransaction;
    }

    const transaction = new Transaction();
    transaction.id = randomUUID();
    transaction.jobId = input.jobId;
    transaction.type = input.type;
    transaction.amount = input.amount;
    transaction.currency = input.currency;
    transaction.moolreReference = input.moolreReference;
    transaction.idempotencyKey = input.idempotencyKey;
    transaction.status = input.status;
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

  private async payWorker(job: Job, changedBy: string, note: string) {
    if (!job.workerId) {
      throw new BadRequestException(
        'Cannot pay a job without an assigned worker',
      );
    }

    if (!job.costAmount) {
      throw new BadRequestException('Cannot pay a job without funded amount');
    }

    if (job.moolreDisbursementRef) {
      return;
    }

    const idempotencyKey = this.createIdempotencyKey(job.id, 'disbursement');
    const disbursement = await this.moolreService.disburse({
      jobId: job.id,
      amount: job.costAmount,
      currency: job.currency,
      idempotencyKey,
      workerId: job.workerId,
      collectionRef: job.moolreCollectionRef ?? undefined,
    });

    this.recordTransaction({
      jobId: job.id,
      type: TransactionType.Disbursement,
      amount: job.costAmount,
      currency: job.currency,
      moolreReference: disbursement.reference,
      idempotencyKey,
      status: disbursement.status,
      rawResponse: disbursement.rawResponse,
    });
    this.assertPaymentSucceeded(disbursement.status, 'disbursement');

    job.moolreDisbursementRef = disbursement.reference;
    this.escrowService.release(job.id);
    this.transition(job, JobStatus.Paid, changedBy, note);
  }

  private async refundSponsor(job: Job, changedBy: string, note: string) {
    if (!job.costAmount) {
      throw new BadRequestException(
        'Cannot refund a job without funded amount',
      );
    }

    const idempotencyKey = this.createIdempotencyKey(job.id, 'refund');
    const refund = await this.moolreService.refund({
      jobId: job.id,
      amount: job.costAmount,
      currency: job.currency,
      idempotencyKey,
      sponsorId: job.sponsorId ?? undefined,
      collectionRef: job.moolreCollectionRef ?? undefined,
    });

    this.recordTransaction({
      jobId: job.id,
      type: TransactionType.Refund,
      amount: job.costAmount,
      currency: job.currency,
      moolreReference: refund.reference,
      idempotencyKey,
      status: refund.status,
      rawResponse: refund.rawResponse,
    });
    this.assertPaymentSucceeded(refund.status, 'refund');

    this.escrowService.refund(job.id);
    this.transition(job, JobStatus.Refunded, changedBy, note);
  }

  private async partiallyPayWorker(
    job: Job,
    amount: string,
    changedBy: string,
    note: string,
  ) {
    if (!job.workerId) {
      throw new BadRequestException(
        'Cannot partially pay a job without an assigned worker',
      );
    }

    const idempotencyKey = this.createIdempotencyKey(
      job.id,
      'partial-disbursement',
    );
    const disbursement = await this.moolreService.disburse({
      jobId: job.id,
      amount,
      currency: job.currency,
      idempotencyKey,
      workerId: job.workerId,
      collectionRef: job.moolreCollectionRef ?? undefined,
    });

    this.recordTransaction({
      jobId: job.id,
      type: TransactionType.Disbursement,
      amount,
      currency: job.currency,
      moolreReference: disbursement.reference,
      idempotencyKey,
      status: disbursement.status,
      rawResponse: disbursement.rawResponse,
    });
    this.assertPaymentSucceeded(disbursement.status, 'partial disbursement');

    this.escrowService.partiallyRelease(job.id);
    this.transition(job, JobStatus.PartiallyPaid, changedBy, note);
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

  private assertPaymentSucceeded(status: TransactionStatus, action: string) {
    if (status !== TransactionStatus.Success) {
      throw new BadGatewayException(
        `Moolre ${action} did not complete successfully`,
      );
    }
  }

  private findTransactionByIdempotencyKey(idempotencyKey: string) {
    return [...this.transactions.values()]
      .flat()
      .find((transaction) => transaction.idempotencyKey === idempotencyKey);
  }

  private createIdempotencyKey(jobId: string, action: string) {
    return `${action}:${jobId}`;
  }

  private async withJobLock<T>(jobId: string, action: () => Promise<T>) {
    if (this.jobLocks.has(jobId)) {
      throw new ConflictException('Job is already being updated');
    }

    this.jobLocks.add(jobId);

    try {
      return await action();
    } finally {
      this.jobLocks.delete(jobId);
    }
  }

  private assertNearbyQueryIsComplete(query: GetJobsQueryDto) {
    const nearbyValues = [query.near_lat, query.near_lng, query.radius];
    const suppliedValues = nearbyValues.filter((value) => value !== undefined);

    if (
      suppliedValues.length > 0 &&
      suppliedValues.length < nearbyValues.length
    ) {
      throw new BadRequestException(
        'near_lat, near_lng, and radius must be provided together',
      );
    }
  }

  private resolveUserFilter(value?: string, currentUser?: JwtUser) {
    if (!value) {
      return undefined;
    }

    if (value === 'me') {
      if (!currentUser) {
        throw new BadRequestException('Cannot resolve "me" without a user');
      }

      return currentUser.sub;
    }

    return value;
  }

  private calculateDistanceKm(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) {
    const earthRadiusKm = 6371;
    const deltaLat = this.toRadians(toLat - fromLat);
    const deltaLng = this.toRadians(toLng - fromLng);
    const fromLatRadians = this.toRadians(fromLat);
    const toLatRadians = this.toRadians(toLat);

    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(fromLatRadians) *
        Math.cos(toLatRadians) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);

    return (
      earthRadiusKm *
      2 *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
    );
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
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
