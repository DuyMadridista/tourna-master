import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744341863472 implements MigrationInterface {
    name = ' $npmConfigName1744341863472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`place\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`numberOfPlayers\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`numberOfGroups\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`teamsPerGroup\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`advancePerGroup\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`knockoutRounds\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` CHANGE \`format\` \`format\` enum ('DIRECT_ELIMINATION', 'ROUND_ROBIN', 'GROUP_STAGE') NOT NULL DEFAULT 'ROUND_ROBIN'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournaments\` CHANGE \`format\` \`format\` enum ('DIRECT_ELIMINATION', 'ROUND_ROBIN') NOT NULL DEFAULT 'ROUND_ROBIN'`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`knockoutRounds\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`advancePerGroup\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`teamsPerGroup\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`numberOfGroups\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`numberOfPlayers\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`place\``);
    }

}
