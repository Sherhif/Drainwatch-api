import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { OtpCode } from '../auth/entities/otp-code.entity';
import { Dispute } from '../jobs/entities/dispute.entity';
import { EscrowLiability } from '../jobs/entities/escrow-liability.entity';
import { JobStatusHistory } from '../jobs/entities/job-status-history.entity';
import { Job } from '../jobs/entities/job.entity';
import { Transaction } from '../jobs/entities/transaction.entity';
import { SmsLogEntity } from '../notifications/entities/sms-log.entity';
import { User } from '../users/entities/user.entity';

const ssl = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'drainwatch',
      }),
  entities: [
    Dispute,
    EscrowLiability,
    Job,
    JobStatusHistory,
    OtpCode,
    SmsLogEntity,
    Transaction,
    User,
  ],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  ssl: ssl ? { rejectUnauthorized: false } : false,
  synchronize: false,
});
