import { Dispute } from '../jobs/entities/dispute.entity';
import { Job } from '../jobs/entities/job.entity';
import {
  presentDispute,
  presentJob,
  presentTransaction,
} from '../jobs/jobs.presenter';
import { JobStatusHistory } from '../jobs/entities/job-status-history.entity';
import { Transaction } from '../jobs/entities/transaction.entity';

type PresentAdminDisputeOptions = {
  job: Job;
  statusHistory: JobStatusHistory[];
  transactions: Transaction[];
};

export function presentAdminDispute(
  dispute: Dispute,
  options: PresentAdminDisputeOptions,
) {
  return {
    ...presentDispute(dispute),
    job: presentJob(options.job),
    photos: {
      report_photo_url: options.job.reportPhotoUrl,
      completion_photo_url: options.job.completionPhotoUrl ?? null,
    },
    status_history: options.statusHistory.map((history) => ({
      id: history.id,
      job_id: history.jobId,
      from_status: history.fromStatus ?? null,
      to_status: history.toStatus,
      changed_by: history.changedBy,
      note: history.note ?? null,
      created_at: history.createdAt.toISOString(),
    })),
    transactions: options.transactions.map(presentTransaction),
  };
}
