import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMoolreChannelToUsers20260714090000
  implements MigrationInterface
{
  name = 'AddMoolreChannelToUsers20260714090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS moolre_channel varchar NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users DROP COLUMN IF EXISTS moolre_channel',
    );
  }
}
