import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1747023950546 implements MigrationInterface {
    name = ' $npmConfigName1747023950546'

    public async up(queryRunner: QueryRunner): Promise<void> {
       
        await queryRunner.query(`ALTER TABLE \`matches\` ADD \`calendarEventId\` varchar(100) NULL`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE \`matches\` DROP COLUMN \`calendarEventId\``);

    }

}
