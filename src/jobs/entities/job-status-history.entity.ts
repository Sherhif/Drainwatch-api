import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus } from '../enums/job-status.enum';

@Entity({ name: 'job_status_history' })
export class JobStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id' })
  jobId: string;

  @Column({ name: 'from_status', nullable: true })
  fromStatus?: JobStatus | null;

  @Column({ name: 'to_status' })
  toStatus: JobStatus;

  @Column({ name: 'changed_by' })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
