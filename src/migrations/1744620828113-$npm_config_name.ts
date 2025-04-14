import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744620828113 implements MigrationInterface {
    name = ' $npmConfigName1744620828113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`group\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`type\` \`type\` enum ('EVENT', 'MATCH', 'GROUP', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL') NOT NULL`);
       
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`type\` \`type\` enum ('EVENT', 'MATCH') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`group\``);
    }

}
