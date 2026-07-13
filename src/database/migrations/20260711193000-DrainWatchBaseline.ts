import { MigrationInterface, QueryRunner } from 'typeorm';

export class DrainWatchBaseline20260711193000 implements MigrationInterface {
  name = 'DrainWatchBaseline20260711193000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name varchar NOT NULL,
        phone_number varchar NOT NULL,
        roles text NOT NULL DEFAULT 'reporter',
        moolre_wallet_ref varchar NULL,
        rating double precision NULL,
        status varchar NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'ALTER TABLE users DROP COLUMN IF EXISTS ghana_card_id',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
      ON users (phone_number)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_status
      ON users (status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone_number varchar NOT NULL,
        otp_code varchar NOT NULL,
        expires_at timestamp NOT NULL,
        consumed_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created_at
      ON otp_codes (phone_number, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_consumed_at
      ON otp_codes (phone_number, consumed_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_id uuid NOT NULL,
        worker_id uuid NULL,
        sponsor_id uuid NULL,
        status varchar NOT NULL DEFAULT 'open',
        severity varchar NOT NULL,
        description text NULL,
        location_lat double precision NOT NULL,
        location_lng double precision NOT NULL,
        report_photo_url varchar NOT NULL,
        report_photo_public_id varchar NULL,
        completion_photo_url varchar NULL,
        completion_photo_public_id varchar NULL,
        cost_amount numeric NULL,
        currency varchar NOT NULL DEFAULT 'GHS',
        moolre_collection_ref varchar NULL,
        moolre_disbursement_ref varchar NULL,
        dispute_deadline timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at
      ON jobs (status, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_severity
      ON jobs (severity)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_reporter_id
      ON jobs (reporter_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_worker_id
      ON jobs (worker_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_sponsor_id
      ON jobs (sponsor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_dispute_deadline
      ON jobs (dispute_deadline)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_location
      ON jobs (location_lat, location_lng)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_status_history (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id uuid NOT NULL,
        from_status varchar NULL,
        to_status varchar NOT NULL,
        changed_by varchar NOT NULL,
        note text NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_status_history_job_created_at
      ON job_status_history (job_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id uuid NOT NULL,
        type varchar NOT NULL,
        amount numeric NOT NULL,
        currency varchar NOT NULL DEFAULT 'GHS',
        moolre_reference varchar NOT NULL,
        idempotency_key varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'pending',
        raw_response json NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key
      ON transactions (idempotency_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_job_created_at
      ON transactions (job_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type_status
      ON transactions (type, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id uuid NOT NULL,
        raised_by uuid NOT NULL,
        reason text NOT NULL,
        resolution varchar NULL,
        resolved_by varchar NULL,
        note text NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        resolved_at timestamp NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_job_id
      ON disputes (job_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_disputes_resolution_created_at
      ON disputes (resolution, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS escrow_liabilities (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id uuid NOT NULL,
        sponsor_id uuid NOT NULL,
        amount numeric NOT NULL,
        currency varchar NOT NULL DEFAULT 'GHS',
        status varchar NOT NULL DEFAULT 'held',
        held_at timestamp NOT NULL,
        released_at timestamp NULL,
        refunded_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_liabilities_job_id
      ON escrow_liabilities (job_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_escrow_liabilities_status
      ON escrow_liabilities (status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event varchar NOT NULL,
        recipient_user_id uuid NOT NULL,
        phone_number varchar NOT NULL,
        message text NOT NULL,
        status varchar NOT NULL DEFAULT 'logged',
        provider_reference varchar NULL,
        raw_response json NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_created_at
      ON sms_logs (recipient_user_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_logs_event_status
      ON sms_logs (event, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS sms_logs');
    await queryRunner.query('DROP TABLE IF EXISTS escrow_liabilities');
    await queryRunner.query('DROP TABLE IF EXISTS disputes');
    await queryRunner.query('DROP TABLE IF EXISTS transactions');
    await queryRunner.query('DROP TABLE IF EXISTS job_status_history');
    await queryRunner.query('DROP TABLE IF EXISTS jobs');
    await queryRunner.query('DROP TABLE IF EXISTS otp_codes');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
