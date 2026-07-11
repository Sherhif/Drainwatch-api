import { NotificationEvent } from '../enums/notification-event.enum';

export type SmsLog = {
  id: string;
  event: NotificationEvent;
  recipient_user_id: string;
  phone_number: string;
  message: string;
  status: 'sent' | 'failed' | 'logged';
  provider_reference?: string | null;
  raw_response?: Record<string, unknown> | null;
  created_at: Date;
};
