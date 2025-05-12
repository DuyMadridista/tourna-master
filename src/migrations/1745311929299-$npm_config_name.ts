// import { MigrationInterface, QueryRunner } from "typeorm";

// export class  $npmConfigName1745311929299 implements MigrationInterface {
//     name = ' $npmConfigName1745311929299'

//     public async up(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`CREATE TABLE \`slots\` (\`id\` int NOT NULL AUTO_INCREMENT, \`slotIndex\` int NOT NULL, \`start_time\` time NOT NULL, \`end_time\` time NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`eventDateId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
//         await queryRunner.query(`ALTER TABLE \`matches\` ADD \`slotId\` int NULL`);
//         await queryRunner.query(`ALTER TABLE \`matches\` ADD UNIQUE INDEX \`IDX_7af6e55ea8446328fc75788917\` (\`slotId\`)`);
//         await queryRunner.query(`CREATE UNIQUE INDEX \`REL_7af6e55ea8446328fc75788917\` ON \`matches\` (\`slotId\`)`);
//         await queryRunner.query(`ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_78792b33dbff525a4199dc2d4e2\` FOREIGN KEY (\`eventDateId\`) REFERENCES \`event_dates\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
//         await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_7af6e55ea8446328fc757889175\` FOREIGN KEY (\`slotId\`) REFERENCES \`slots\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
//         await queryRunner.query(`ALTER TABLE \`player_match\` ADD CONSTRAINT \`FK_78aa64e174aa4c9b78106743263\` FOREIGN KEY (\`playerId\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
//         await queryRunner.query(`ALTER TABLE \`player_match\` ADD CONSTRAINT \`FK_7b2d44f43275b7e31ee11623a69\` FOREIGN KEY (\`matchId\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
//     }

//     public async down(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_7b2d44f43275b7e31ee11623a69\``);
//         await queryRunner.query(`ALTER TABLE \`player_match\` DROP FOREIGN KEY \`FK_78aa64e174aa4c9b78106743263\``);
//         await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_7af6e55ea8446328fc757889175\``);
//         await queryRunner.query(`ALTER TABLE \`slots\` DROP FOREIGN KEY \`FK_78792b33dbff525a4199dc2d4e2\``);
//         await queryRunner.query(`DROP INDEX \`REL_7af6e55ea8446328fc75788917\` ON \`matches\``);
//         await queryRunner.query(`ALTER TABLE \`matches\` DROP INDEX \`IDX_7af6e55ea8446328fc75788917\``);
//         await queryRunner.query(`ALTER TABLE \`matches\` DROP COLUMN \`slotId\``);
//         await queryRunner.query(`DROP TABLE \`slots\``);
//     }

// }
