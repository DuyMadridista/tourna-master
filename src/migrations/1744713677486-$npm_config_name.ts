import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744713677486 implements MigrationInterface {
    name = ' $npmConfigName1744713677486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_c253cdfd468fa36f73efcbfbf79\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_d4e821efd15023d1dc517264796\``);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`type\` \`type\` enum ('EVENT', 'MATCH', 'GROUP', 'KNOCKOUT', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`team_one_id\` \`team_one_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`team_two_id\` \`team_two_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_c253cdfd468fa36f73efcbfbf79\` FOREIGN KEY (\`team_one_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_d4e821efd15023d1dc517264796\` FOREIGN KEY (\`team_two_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_7b2d44f43275b7e31ee11623a69\``);
        await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_78aa64e174aa4c9b78106743263\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_d4e821efd15023d1dc517264796\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_c253cdfd468fa36f73efcbfbf79\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` CHANGE \`title\` \`title\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`team_two_id\` \`team_two_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`team_one_id\` \`team_one_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`type\` \`type\` enum ('EVENT', 'MATCH', 'GROUP', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_d4e821efd15023d1dc517264796\` FOREIGN KEY (\`team_two_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_c253cdfd468fa36f73efcbfbf79\` FOREIGN KEY (\`team_one_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
