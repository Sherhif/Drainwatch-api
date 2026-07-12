import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationEvent } from '../enums/notification-event.enum';

@Entity({ name: 'sms_logs' })
@Index('idx_sms_logs_recipient_created_at', ['recipientUserId', 'createdAt'])
@Index('idx_sms_logs_event_status', ['event', 'status'])
export class SmsLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  event: NotificationEvent;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId: string;

  @Column({ name: 'phone_number', type: 'varchar' })
  phoneNumber: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: 'logged' })
  status: 'logged' | 'sent' | 'failed';

  @Column({ name: 'provider_reference', type: 'varchar', nullable: true })
  providerReference?: string | null;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
