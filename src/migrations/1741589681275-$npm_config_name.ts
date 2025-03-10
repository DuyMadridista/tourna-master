import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1741589681275 implements MigrationInterface {
    name = ' $npmConfigName1741589681275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone_number\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone_number\` varchar(25) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD CONSTRAINT \`FK_8d1640ac35baf78db792ca29bc3\` FOREIGN KEY (\`categoryId\`) REFERENCES \`category\`(\`categoryId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP FOREIGN KEY \`FK_8d1640ac35baf78db792ca29bc3\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone_number\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone_number\` varchar(11) NULL`);
    }

}
