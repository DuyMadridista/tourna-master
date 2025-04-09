import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import e from 'express';
import { join } from 'path';
import { Category } from 'src/modules/category/entities/category.entity';
import { EventDate } from 'src/modules/event-date/entities/event-date.entity';
import { Match } from 'src/modules/match/entities/match.entity';
import { PlayerMatch } from 'src/modules/player-match/player-match.entity';
import { Player } from 'src/modules/player/entities/player.entity';
import { Team } from 'src/modules/team/entities/team.entity';
import { Tournament } from 'src/modules/tournament/entities/tournament.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { DataSource, DataSourceOptions } from 'typeorm';
dotenvConfig({ path: '.env' });
const config = {
  type: 'mysql',
  host: `${process.env.DB_HOST}`,
  port: `${process.env.DB_PORT}`,
  username: `${process.env.DB_USERNAME}`,
  password: `${process.env.DB_PASSWORD}`,
  database: `${process.env.DB_DATABASE}`,
  // entities: [join(__dirname, '**', 'entities/*.entity.{ts,js}')],
  entities: [User, Tournament, EventDate, Match, Player, Team, Category, PlayerMatch],
  migrations: [join(__dirname, '..', 'migrations/*.{ts,js}')],
  autoLoadEntities: true,
  synchronize: false,
  logging: true,
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
