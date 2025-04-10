import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744259861305 implements MigrationInterface {
    name = ' $npmConfigName1744259861305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`players\` ADD \`number\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`players\` DROP COLUMN \`number\``);
    }

}
