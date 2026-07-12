import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';

@Entity({ name: 'transactions' })
@Index('idx_transactions_job_created_at', ['jobId', 'createdAt'])
@Index('idx_transactions_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('idx_transactions_type_status', ['type', 'status'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ type: 'varchar' })
  type: TransactionType;

  @Column({ type: 'decimal' })
  amount: string;

  @Column({ type: 'varchar', default: 'GHS' })
  currency: string;

  @Column({ name: 'moolre_reference', type: 'varchar' })
  moolreReference: string;

  @Column({ name: 'idempotency_key', type: 'varchar', unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', default: TransactionStatus.Pending })
  status: TransactionStatus;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
