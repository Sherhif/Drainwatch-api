import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobSeverity } from '../enums/job-severity.enum';
import { JobStatus } from '../enums/job-status.enum';

@Entity({ name: 'jobs' })
@Index('idx_jobs_status_created_at', ['status', 'createdAt'])
@Index('idx_jobs_severity', ['severity'])
@Index('idx_jobs_reporter_id', ['reporterId'])
@Index('idx_jobs_worker_id', ['workerId'])
@Index('idx_jobs_sponsor_id', ['sponsorId'])
@Index('idx_jobs_dispute_deadline', ['disputeDeadline'])
@Index('idx_jobs_location', ['locationLat', 'locationLng'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId?: string | null;

  @Column({ name: 'sponsor_id', type: 'uuid', nullable: true })
  sponsorId?: string | null;

  @Column({ type: 'varchar', default: JobStatus.Open })
  status: JobStatus;

  @Column({ type: 'varchar' })
  severity: JobSeverity;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'location_lat', type: 'float' })
  locationLat: number;

  @Column({ name: 'location_lng', type: 'float' })
  locationLng: number;

  @Column({ name: 'report_photo_url', type: 'varchar' })
  reportPhotoUrl: string;

  @Column({ name: 'report_photo_public_id', type: 'varchar', nullable: true })
  reportPhotoPublicId?: string | null;

  @Column({ name: 'completion_photo_url', type: 'varchar', nullable: true })
  completionPhotoUrl?: string | null;

  @Column({
    name: 'completion_photo_public_id',
    type: 'varchar',
    nullable: true,
  })
  completionPhotoPublicId?: string | null;

  @Column({ name: 'cost_amount', type: 'decimal', nullable: true })
  costAmount?: string | null;

  @Column({ type: 'varchar', default: 'GHS' })
  currency: string;

  @Column({ name: 'moolre_collection_ref', type: 'varchar', nullable: true })
  moolreCollectionRef?: string | null;

  @Column({ name: 'moolre_disbursement_ref', type: 'varchar', nullable: true })
  moolreDisbursementRef?: string | null;

  @Column({ name: 'dispute_deadline', type: 'timestamp', nullable: true })
  disputeDeadline?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
