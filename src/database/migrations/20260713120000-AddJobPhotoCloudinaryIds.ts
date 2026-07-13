import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobPhotoCloudinaryIds20260713120000
  implements MigrationInterface
{
  name = 'AddJobPhotoCloudinaryIds20260713120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS report_photo_public_id varchar NULL
    `);
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS completion_photo_public_id varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN IF EXISTS completion_photo_public_id
    `);
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN IF EXISTS report_photo_public_id
    `);
  }
}
