import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750001016067 implements MigrationInterface {
    name = ' $npmConfigName1750001016067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`slots\` ADD \`fieldIndex\` int NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`numberOfFields\` int NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`numberOfFields\``);
        await queryRunner.query(`ALTER TABLE \`slots\` DROP COLUMN \`fieldIndex\``);
    }

}
