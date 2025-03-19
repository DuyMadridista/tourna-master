import { MigrationInterface, QueryRunner } from 'typeorm';

export class $npmConfigName1741661160453 implements MigrationInterface {
  name = ' $npmConfigName1741661160453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tournaments\` CHANGE \`start_time_default\` \`start_time_default\` time NULL DEFAULT '00:00:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tournaments\` CHANGE \`end_time_default\` \`end_time_default\` time NULL DEFAULT '23:59:59'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tournaments\` CHANGE \`end_time_default\` \`end_time_default\` time NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tournaments\` CHANGE \`start_time_default\` \`start_time_default\` time NULL`,
    );
  }
}
