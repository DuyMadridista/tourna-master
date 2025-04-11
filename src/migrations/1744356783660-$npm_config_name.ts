import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744356783660 implements MigrationInterface {
    name = ' $npmConfigName1744356783660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`knockoutRounds\``);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`tier\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`leaderName\` varchar(30) NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`leaderEmail\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`leaderPhoneNumber\` varchar(15) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`leaderPhoneNumber\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`leaderEmail\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`leaderName\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`tier\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`knockoutRounds\` int NULL`);
    }

}
