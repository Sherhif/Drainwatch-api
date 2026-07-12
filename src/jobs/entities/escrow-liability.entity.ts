import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EscrowLiabilityStatus =
  | 'held'
  | 'released'
  | 'refunded'
  | 'partially_released';

@Entity({ name: 'escrow_liabilities' })
@Index('idx_escrow_liabilities_job_id', ['jobId'], { unique: true })
@Index('idx_escrow_liabilities_status', ['status'])
export class EscrowLiability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid', unique: true })
  jobId: string;

  @Column({ name: 'sponsor_id', type: 'uuid' })
  sponsorId: string;

  @Column({ type: 'decimal' })
  amount: string;

  @Column({ type: 'varchar', default: 'GHS' })
  currency: string;

  @Column({ type: 'varchar', default: 'held' })
  status: EscrowLiabilityStatus;

  @Column({ name: 'held_at', type: 'timestamp' })
  heldAt: Date;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt?: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
