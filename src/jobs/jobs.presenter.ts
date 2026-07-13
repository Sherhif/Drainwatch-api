import { Dispute } from './entities/dispute.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { Job } from './entities/job.entity';
import { Transaction } from './entities/transaction.entity';

type PresentJobOptions = {
  statusHistory?: JobStatusHistory[];
  transactions?: Transaction[];
  dispute?: Dispute | null;
};

export function presentJob(job: Job, options: PresentJobOptions = {}) {
  return {
    id: job.id,
    reporter_id: job.reporterId,
    worker_id: job.workerId ?? null,
    sponsor_id: job.sponsorId ?? null,
    status: job.status,
    severity: job.severity,
    description: job.description ?? null,
    location_lat: job.locationLat,
    location_lng: job.locationLng,
    report_photo_url: job.reportPhotoUrl,
    report_photo_public_id: job.reportPhotoPublicId ?? null,
    completion_photo_url: job.completionPhotoUrl ?? null,
    completion_photo_public_id: job.completionPhotoPublicId ?? null,
    cost_amount: job.costAmount ?? null,
    currency: job.currency,
    moolre_collection_ref: job.moolreCollectionRef ?? null,
    moolre_disbursement_ref: job.moolreDisbursementRef ?? null,
    dispute_deadline: job.disputeDeadline?.toISOString() ?? null,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
    ...(options.statusHistory
      ? {
          status_history: options.statusHistory.map(presentJobStatusHistory),
        }
      : {}),
    ...(options.transactions
      ? {
          transactions: options.transactions.map(presentTransaction),
        }
      : {}),
    ...(options.dispute !== undefined
      ? {
          dispute: options.dispute ? presentDispute(options.dispute) : null,
        }
      : {}),
  };
}

export function presentJobStatusHistory(history: JobStatusHistory) {
  return {
    id: history.id,
    job_id: history.jobId,
    from_status: history.fromStatus ?? null,
    to_status: history.toStatus,
    changed_by: history.changedBy,
    note: history.note ?? null,
    created_at: history.createdAt.toISOString(),
  };
}

export function presentTransaction(transaction: Transaction) {
  return {
    id: transaction.id,
    job_id: transaction.jobId,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    moolre_reference: transaction.moolreReference,
    idempotency_key: transaction.idempotencyKey,
    status: transaction.status,
    raw_response: transaction.rawResponse ?? null,
    created_at: transaction.createdAt.toISOString(),
  };
}

export function presentDispute(dispute: Dispute) {
  return {
    id: dispute.id,
    job_id: dispute.jobId,
    raised_by: dispute.raisedBy,
    reason: dispute.reason,
    resolution: dispute.resolution ?? null,
    resolved_by: dispute.resolvedBy ?? null,
    note: dispute.note ?? null,
    created_at: dispute.createdAt.toISOString(),
    updated_at: dispute.updatedAt.toISOString(),
    resolved_at: dispute.resolvedAt?.toISOString() ?? null,
  };
}
