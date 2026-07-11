import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobSeverity } from '../enums/job-severity.enum';
import { JobStatus } from '../enums/job-status.enum';

@Entity({ name: 'jobs' })
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @Column({ name: 'worker_id', nullable: true })
  workerId?: string | null;

  @Column({ name: 'sponsor_id', nullable: true })
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

  @Column({ name: 'report_photo_url' })
  reportPhotoUrl: string;

  @Column({ name: 'completion_photo_url', nullable: true })
  completionPhotoUrl?: string | null;

  @Column({ name: 'cost_amount', type: 'decimal', nullable: true })
  costAmount?: string | null;

  @Column({ default: 'GHS' })
  currency: string;

  @Column({ name: 'moolre_collection_ref', nullable: true })
  moolreCollectionRef?: string | null;

  @Column({ name: 'moolre_disbursement_ref', nullable: true })
  moolreDisbursementRef?: string | null;

  @Column({ name: 'dispute_deadline', nullable: true })
  disputeDeadline?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
