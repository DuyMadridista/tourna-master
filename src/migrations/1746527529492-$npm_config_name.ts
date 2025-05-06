import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1746527529492 implements MigrationInterface {
    name = ' $npmConfigName1746527529492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` ADD \`round\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD \`seedIndex\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP COLUMN \`round\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP COLUMN \`seedIndex\``);
    }

}
