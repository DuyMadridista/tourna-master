import { forwardRef, Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { TeamModule } from '../team/team.module';
import { EventDateModule } from '../event-date/event-date.module';
import { Team } from '../team/entities/team.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { MatchUtils } from 'src/helper/match.utils';
import { TeamRepository } from '../team/team.repository';
import { MatchRepository } from './match.repository';
import { TournamentRepository } from '../tournament/tournament.repository';
import { PlayerMatchModule } from '../player-match/player-match.module';
import { PlayerMatch } from '../player-match/player-match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Team, Tournament, PlayerMatch]),
    forwardRef(() => TeamModule),
    forwardRef(() => EventDateModule),
    forwardRef(() => PlayerMatchModule),
  ],
  controllers: [MatchController],
  providers: [
    MatchService,
    MatchUtils,
    TeamRepository,
    MatchRepository,
    TournamentRepository,
  ],
  exports: [MatchService],
})
export class MatchModule {}
