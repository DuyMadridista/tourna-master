import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventDateService } from './event-date.service';
import { EventDateController } from './event-date.controller';
import { EventDateRepository } from './event-date.repository';
import { TournamentModule } from '../tournament/tournament.module';
import { MatchModule } from '../match/match.module';
import { EventDate } from './entities/event-date.entity';
import { Match } from '../match/entities/match.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { TournamentRepository } from '../tournament/tournament.repository';
import { MatchRepository } from '../match/match.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EventDate, Match, Tournament])],
  controllers: [EventDateController],
  providers: [
    EventDateService,
    TournamentRepository,
    EventDateRepository,
    MatchRepository,
  ],
  exports: [EventDateService],
})
export class EventDateModule {}
