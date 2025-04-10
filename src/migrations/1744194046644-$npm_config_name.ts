import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1744194046644 implements MigrationInterface {
    name = ' $npmConfigName1744194046644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`CREATE TABLE \`player_match\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playerId\` int NOT NULL, \`matchId\` int NOT NULL, \`goals\` int NOT NULL DEFAULT '0', \`goalMinutes\` text NULL, \`yellowCards\` int NOT NULL DEFAULT '0', \`yellowCardMinutes\` text NULL, \`redCard\` tinyint NOT NULL DEFAULT 0, \`redCardMinute\` int NULL, \`isStarter\` tinyint NOT NULL DEFAULT 1, \`minutesIn\` int NULL, \`minutesOut\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        // await queryRunner.query(`ALTER TABLE \`player_match\` ADD CONSTRAINT \`FK_78aa64e174aa4c9b78106743263\` FOREIGN KEY (\`playerId\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE \`player_match\` ADD CONSTRAINT \`FK_7b2d44f43275b7e31ee11623a69\` FOREIGN KEY (\`matchId\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_7b2d44f43275b7e31ee11623a69\``);
        await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_78aa64e174aa4c9b78106743263\``);
        await queryRunner.query(`DROP TABLE \`player_match\``);
    }

}
