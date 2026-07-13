import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { ResolveDisputeDto } from '../admin/dto/resolve-dispute.dto';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadedFile } from '../common/types/uploaded-file.type';
import { MoolreService } from '../moolre/moolre.service';
import { NotificationsService } from '../notifications/notifications.service';
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
import { EscrowService } from './escrow.service';
import { DisputeResolution } from './enums/dispute-resolution.enum';
import { JobStatus } from './enums/job-status.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransactionType } from './enums/transaction-type.enum';
import { PhotoValidationService } from './photo-validation.service';

@Injectable()
export class JobsService {
  private readonly jobLocks = new Set<string>();

  constructor(
    private readonly escrowService: EscrowService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly moolreService: MoolreService,
    private readonly notificationsService: NotificationsService,
    private readonly photoValidationService: PhotoValidationService,
    @InjectRepository(Dispute)
    private readonly disputesRepository: Repository<Dispute>,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(JobStatusHistory)
    private readonly statusHistoryRepository: Repository<JobStatusHistory>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    currentUser: JwtUser,
    reportPhoto?: UploadedFile,
  ) {
    this.photoValidationService.validate({
      file: reportPhoto,
      fallbackUrl: createJobDto.report_photo_url,
      kind: 'report',
    });

    const uploadedReportPhoto = reportPhoto
      ? await this.cloudinaryService.uploadJobPhoto(reportPhoto, 'report')
      : null;
    const reportPhotoUrl =
      uploadedReportPhoto?.secureUrl ?? createJobDto.report_photo_url;

    if (!reportPhotoUrl) {
      throw new BadRequestException('A report photo is required');
    }

    const job = await this.jobsRepository.save(
      this.jobsRepository.create({
        reporterId: currentUser.sub,
        workerId: null,
        sponsorId: null,
        status: JobStatus.Open,
        severity: createJobDto.severity,
        description: createJobDto.description ?? null,
        locationLat: createJobDto.lat,
        locationLng: createJobDto.lng,
        reportPhotoUrl,
        reportPhotoPublicId: uploadedReportPhoto?.publicId ?? null,
        completionPhotoUrl: null,
        completionPhotoPublicId: null,
        costAmount: null,
        currency: 'GHS',
        moolreCollectionRef: null,
        moolreDisbursementRef: null,
        disputeDeadline: null,
      }),
    );

    await this.recordStatusHistory({
      jobId: job.id,
      fromStatus: null,
      toStatus: JobStatus.Open,
      changedBy: currentUser.sub,
      note: 'Job reported',
    });

    return job;
  }

  async findAll(query: GetJobsQueryDto, currentUser?: JwtUser) {
    this.assertNearbyQueryIsComplete(query);

    const nearLat = query.near_lat;
    const nearLng = query.near_lng;
    const radius = query.radius;
    const shouldFilterByDistance =
      nearLat !== undefined && nearLng !== undefined && radius !== undefined;

    const sponsorId = this.resolveUserFilter(query.sponsor_id, currentUser);
    const workerId = this.resolveUserFilter(query.worker_id, currentUser);
    const reporterId = this.resolveUserFilter(query.reporter_id, currentUser);

    const where: FindOptionsWhere<Job> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (sponsorId) {
      where.sponsorId = sponsorId;
    }

    if (workerId) {
      where.workerId = workerId;
    }

    if (reporterId) {
      where.reporterId = reporterId;
    }

    const jobs = await this.jobsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (!shouldFilterByDistance) {
      return jobs;
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

  async findOne(id: string) {
    const job = await this.jobsRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  getStatusHistory(jobId: string) {
    return this.statusHistoryRepository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
  }

  getTransactions(jobId: string) {
    return this.transactionsRepository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
  }

  getDispute(jobId: string) {
    return this.disputesRepository.findOne({ where: { jobId } });
  }

  async findOpenDisputes() {
    const disputes = await this.disputesRepository.find({
      where: { resolution: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const disputesWithJobs: { dispute: Dispute; job: Job }[] = [];

    for (const dispute of disputes) {
      disputesWithJobs.push({
        dispute,
        job: await this.findOne(dispute.jobId),
      });
    }

    return disputesWithJobs;
  }

  async findDisputeById(id: string) {
    const dispute = await this.disputesRepository.findOne({ where: { id } });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async fund(id: string, fundJobDto: FundJobDto, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);

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

      await this.recordTransaction({
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
      await this.escrowService.hold({
        jobId: job.id,
        sponsorId: currentUser.sub,
        amount,
        currency,
      });
      await this.transition(job, JobStatus.Funded, currentUser.sub, 'Job funded');

      return job;
    });
  }

  async claim(id: string, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.Funded]);

      job.workerId = currentUser.sub;
      await this.transition(job, JobStatus.Claimed, currentUser.sub, 'Job claimed');

      return job;
    });
  }

  async start(id: string, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.Claimed]);
      this.assertAssignedWorker(job, currentUser);

      await this.transition(
        job,
        JobStatus.InProgress,
        currentUser.sub,
        'Worker started job',
      );

      return job;
    });
  }

  async complete(
    id: string,
    completeJobDto: CompleteJobDto,
    currentUser: JwtUser,
    completionPhoto?: UploadedFile,
  ) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.InProgress]);
      this.assertAssignedWorker(job, currentUser);
      this.photoValidationService.validate({
        file: completionPhoto,
        fallbackUrl: completeJobDto.completion_photo_url,
        kind: 'completion',
      });

      const uploadedCompletionPhoto = completionPhoto
        ? await this.cloudinaryService.uploadJobPhoto(
            completionPhoto,
            'completion',
          )
        : null;
      const completionPhotoUrl =
        uploadedCompletionPhoto?.secureUrl ??
        completeJobDto.completion_photo_url;

      job.completionPhotoUrl = completionPhotoUrl;
      job.completionPhotoPublicId =
        uploadedCompletionPhoto?.publicId ?? job.completionPhotoPublicId ?? null;
      job.disputeDeadline = new Date(Date.now() + 48 * 60 * 60_000);
      await this.transition(
        job,
        JobStatus.CompletedPendingReview,
        currentUser.sub,
        'Worker submitted completion proof',
      );

      return job;
    });
  }

  async approve(id: string, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);

      if (job.status === JobStatus.Paid && job.moolreDisbursementRef) {
        this.assertSponsor(job, currentUser);
        return job;
      }

      this.assertCurrentStatus(job, [JobStatus.CompletedPendingReview]);
      this.assertSponsor(job, currentUser);

      await this.transition(
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

  async dispute(
    id: string,
    disputeJobDto: DisputeJobDto,
    currentUser: JwtUser,
  ) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.CompletedPendingReview]);
      this.assertSponsor(job, currentUser);

      if (job.disputeDeadline && job.disputeDeadline.getTime() < Date.now()) {
        throw new BadRequestException('Dispute window has closed');
      }

      if (await this.getDispute(job.id)) {
        throw new BadRequestException('This job already has a dispute');
      }

      await this.disputesRepository.save(
        this.disputesRepository.create({
          jobId: job.id,
          raisedBy: currentUser.sub,
          reason: disputeJobDto.reason,
          resolution: null,
          resolvedBy: null,
          note: null,
          resolvedAt: null,
        }),
      );
      await this.transition(
        job,
        JobStatus.Disputed,
        currentUser.sub,
        'Sponsor disputed completion',
      );

      return job;
    });
  }

  async cancel(id: string, currentUser: JwtUser) {
    return this.withJobLock(id, async () => {
      const job = await this.findOne(id);
      this.assertCurrentStatus(job, [JobStatus.Open]);

      const isReporter = job.reporterId === currentUser.sub;
      const isAdmin = currentUser.roles.includes(UserRole.Admin);

      if (!isReporter && !isAdmin) {
        throw new ForbiddenException(
          'Only the reporter or an admin can cancel this job',
        );
      }

      await this.transition(job, JobStatus.Cancelled, currentUser.sub, 'Job cancelled');

      return job;
    });
  }

  async resolveDispute(
    disputeId: string,
    resolveDisputeDto: ResolveDisputeDto,
    currentUser: JwtUser,
  ) {
    const dispute = await this.findDisputeById(disputeId);

    return this.withJobLock(dispute.jobId, async () => {
      const job = await this.findOne(dispute.jobId);

      if (dispute.resolution) {
        return { dispute, job };
      }

      this.assertCurrentStatus(job, [JobStatus.Disputed]);

      const note =
        resolveDisputeDto.note ??
        `Admin resolved dispute as ${resolveDisputeDto.resolution}`;

      if (resolveDisputeDto.resolution === DisputeResolution.Released) {
        await this.payWorker(job, currentUser.sub, note);
      }

      if (resolveDisputeDto.resolution === DisputeResolution.Rejected) {
        await this.refundSponsor(job, currentUser.sub, note);
      }

      if (resolveDisputeDto.resolution === DisputeResolution.Partial) {
        const partialAmount = this.resolvePartialAmount(resolveDisputeDto, job);
        await this.partiallyPayWorker(
          job,
          partialAmount,
          currentUser.sub,
          note,
        );
      }

      dispute.resolution = resolveDisputeDto.resolution;
      dispute.resolvedBy = currentUser.sub;
      dispute.note = note;
      dispute.resolvedAt = new Date();
      await this.disputesRepository.save(dispute);
      await this.notificationsService.notifyDisputeResolved(job, job.status);

      return { dispute, job };
    });
  }

  async autoApproveDueJobs(now = new Date()) {
    const dueJobs = await this.jobsRepository.find({
      where: {
        status: JobStatus.CompletedPendingReview,
        disputeDeadline: LessThanOrEqual(now),
      },
      order: { disputeDeadline: 'ASC' },
    });

    const approvedJobs: Job[] = [];

    for (const job of dueJobs) {
      if (await this.getDispute(job.id)) {
        continue;
      }

      const approvedJob = await this.withJobLock(job.id, async () => {
        const currentJob = await this.findOne(job.id);

        if (currentJob.status === JobStatus.Paid) {
          return currentJob;
        }

        if (await this.getDispute(currentJob.id)) {
          return currentJob;
        }

        this.assertCurrentStatus(currentJob, [
          JobStatus.CompletedPendingReview,
        ]);
        await this.transition(
          currentJob,
          JobStatus.Approved,
          'system:auto-approval',
          'Auto-approved after 48-hour review window',
        );
        await this.payWorker(
          currentJob,
          'system:auto-approval',
          'Auto payout after 48-hour review window',
        );
        return currentJob;
      });

      if (approvedJob.status === JobStatus.Paid) {
        approvedJobs.push(approvedJob);
      }
    }

    return approvedJobs;
  }

  private recordStatusHistory(input: {
    jobId: string;
    fromStatus?: JobStatus | null;
    toStatus: JobStatus;
    changedBy: string;
    note?: string;
  }) {
    return this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        jobId: input.jobId,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        changedBy: input.changedBy,
        note: input.note ?? null,
      }),
    );
  }

  private async recordTransaction(input: {
    jobId: string;
    type: TransactionType;
    amount: string;
    currency: string;
    moolreReference: string;
    idempotencyKey: string;
    status: TransactionStatus;
    rawResponse: Record<string, unknown>;
  }) {
    const existingTransaction =
      await this.transactionsRepository.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });

    if (existingTransaction) {
      existingTransaction.moolreReference = input.moolreReference;
      existingTransaction.status = input.status;
      existingTransaction.rawResponse = input.rawResponse;
      return this.transactionsRepository.save(existingTransaction);
    }

    return this.transactionsRepository.save(
      this.transactionsRepository.create({
        jobId: input.jobId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        moolreReference: input.moolreReference,
        idempotencyKey: input.idempotencyKey,
        status: input.status,
        rawResponse: input.rawResponse,
      }),
    );
  }

  private async transition(
    job: Job,
    toStatus: JobStatus,
    changedBy: string,
    note: string,
  ) {
    const fromStatus = job.status;

    job.status = toStatus;
    await this.jobsRepository.save(job);
    await this.recordStatusHistory({
      jobId: job.id,
      fromStatus,
      toStatus,
      changedBy,
      note,
    });
    await this.notificationsService.notifyJobTransition(job, toStatus);
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

    await this.recordTransaction({
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
    await this.escrowService.release(job.id);
    await this.transition(job, JobStatus.Paid, changedBy, note);
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

    await this.recordTransaction({
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

    await this.escrowService.refund(job.id);
    await this.transition(job, JobStatus.Refunded, changedBy, note);
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

    await this.recordTransaction({
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

    await this.escrowService.partiallyRelease(job.id);
    await this.transition(job, JobStatus.PartiallyPaid, changedBy, note);
  }

  private resolvePartialAmount(resolveDisputeDto: ResolveDisputeDto, job: Job) {
    if (resolveDisputeDto.partial_amount === undefined) {
      throw new BadRequestException(
        'partial_amount is required when resolution is partial',
      );
    }

    if (!job.costAmount) {
      throw new BadRequestException(
        'Cannot partially pay a job without amount',
      );
    }

    const partialAmount = resolveDisputeDto.partial_amount;
    const jobAmount = Number(job.costAmount);

    if (partialAmount >= jobAmount) {
      throw new BadRequestException(
        'partial_amount must be less than the funded job amount',
      );
    }

    return partialAmount.toFixed(2);
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
}
