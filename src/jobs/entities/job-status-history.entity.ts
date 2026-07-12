import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus } from '../enums/job-status.enum';

@Entity({ name: 'job_status_history' })
@Index('idx_job_status_history_job_created_at', ['jobId', 'createdAt'])
export class JobStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus?: JobStatus | null;

  @Column({ name: 'to_status', type: 'varchar' })
  toStatus: JobStatus;

  @Column({ name: 'changed_by', type: 'varchar' })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
