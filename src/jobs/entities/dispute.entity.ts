import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

@Entity({ name: 'disputes' })
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id' })
  jobId: string;

  @Column({ name: 'raised_by' })
  raisedBy: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  resolution?: DisputeResolution | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt?: Date | null;
}
