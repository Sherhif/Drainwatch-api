import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

@Entity({ name: 'disputes' })
@Index('idx_disputes_job_id', ['jobId'], { unique: true })
@Index('idx_disputes_resolution_created_at', ['resolution', 'createdAt'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'raised_by', type: 'uuid' })
  raisedBy: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  resolution?: DisputeResolution | null;

  @Column({ name: 'resolved_by', type: 'varchar', nullable: true })
  resolvedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;
}
