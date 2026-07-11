import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id' })
  jobId: string;

  @Column({ type: 'varchar' })
  type: TransactionType;

  @Column({ type: 'decimal' })
  amount: string;

  @Column({ default: 'GHS' })
  currency: string;

  @Column({ name: 'moolre_reference' })
  moolreReference: string;

  @Column({ type: 'varchar', default: TransactionStatus.Pending })
  status: TransactionStatus;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
