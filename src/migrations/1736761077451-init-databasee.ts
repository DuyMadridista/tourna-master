import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDatabasee1736761077451 implements MigrationInterface {
  name = 'InitDatabasee1736761077451';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(50) NOT NULL, \`password\` varchar(255) NOT NULL, \`first_name\` varchar(255) NOT NULL, \`last_name\` varchar(255) NOT NULL, \`phone_number\` varchar(11) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`date_of_birth\` date NULL, \`role\` enum ('USER', 'ADMIN') NOT NULL DEFAULT 'USER', \`is_deleted\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`players\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`dob\` datetime NULL, \`phone\` varchar(11) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`team_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`teams\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(30) NOT NULL, \`score\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournament_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`matches\` (\`id\` int NOT NULL AUTO_INCREMENT, \`team_one_result\` int NULL, \`team_two_result\` int NULL, \`start_time\` time NULL, \`end_time\` time NULL, \`duration\` int NULL, \`title\` varchar(100) NULL, \`type\` enum ('EVENT', 'MATCH') NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`team_one_id\` int NOT NULL, \`team_two_id\` int NOT NULL, \`event_date_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`event_dates\` (\`id\` int NOT NULL AUTO_INCREMENT, \`date\` date NOT NULL, \`start_time\` time NULL, \`end_time\` time NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournamentId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tournaments\` (\`tournament_id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`category_id\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`status\` enum ('NEED_INFORMATION', 'READY', 'IN_PROGRESS', 'FINISHED', 'DISCARDED', 'DELETED') NOT NULL DEFAULT 'NEED_INFORMATION', \`match_duration\` int NULL, \`time_between\` int NULL, \`start_time_default\` time NULL, \`end_time_default\` time NULL, \`format\` enum ('DIRECT_ELIMINATION', 'ROUND_ROBIN') NOT NULL DEFAULT 'ROUND_ROBIN', \`is_deleted\` tinyint NOT NULL DEFAULT 0, \`deleted_at\` timestamp NULL, \`description\` text NULL, PRIMARY KEY (\`tournament_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`organizer_tournaments\` (\`tournament_id\` int NOT NULL, \`user_id\` int NOT NULL, INDEX \`IDX_429a1b4ed3349c51ae7a54e006\` (\`tournament_id\`), INDEX \`IDX_f2812259a60f82b044a69dff3f\` (\`user_id\`), PRIMARY KEY (\`tournament_id\`, \`user_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`players\` ADD CONSTRAINT \`FK_ce457a554d63e92f4627d6c5763\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_85bce610ca3a492d9c23de8ad20\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`tournament_id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_c253cdfd468fa36f73efcbfbf79\` FOREIGN KEY (\`team_one_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_d4e821efd15023d1dc517264796\` FOREIGN KEY (\`team_two_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_25b8004650c2e34bf3986b95cfc\` FOREIGN KEY (\`event_date_id\`) REFERENCES \`event_dates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`event_dates\` ADD CONSTRAINT \`FK_de31775302f32bb2a8685b6f30d\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournaments\`(\`tournament_id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizer_tournaments\` ADD CONSTRAINT \`FK_429a1b4ed3349c51ae7a54e0066\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`tournament_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizer_tournaments\` ADD CONSTRAINT \`FK_f2812259a60f82b044a69dff3f6\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizer_tournaments\` DROP FOREIGN KEY \`FK_f2812259a60f82b044a69dff3f6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizer_tournaments\` DROP FOREIGN KEY \`FK_429a1b4ed3349c51ae7a54e0066\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`event_dates\` DROP FOREIGN KEY \`FK_de31775302f32bb2a8685b6f30d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_25b8004650c2e34bf3986b95cfc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_d4e821efd15023d1dc517264796\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_c253cdfd468fa36f73efcbfbf79\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_85bce610ca3a492d9c23de8ad20\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`players\` DROP FOREIGN KEY \`FK_ce457a554d63e92f4627d6c5763\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f2812259a60f82b044a69dff3f\` ON \`organizer_tournaments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_429a1b4ed3349c51ae7a54e006\` ON \`organizer_tournaments\``,
    );
    await queryRunner.query(`DROP TABLE \`organizer_tournaments\``);
    await queryRunner.query(`DROP TABLE \`tournaments\``);
    await queryRunner.query(`DROP TABLE \`event_dates\``);
    await queryRunner.query(`DROP TABLE \`matches\``);
    await queryRunner.query(`DROP TABLE \`teams\``);
    await queryRunner.query(`DROP TABLE \`players\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
