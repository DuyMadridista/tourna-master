import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { MatchModule } from '../match/match.module';
import { EventDateModule } from '../event-date/event-date.module';
import { TournamentModule } from '../tournament/tournament.module';
import { MatchUtils } from 'src/helper/match.utils';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [MatchModule, EventDateModule, TournamentModule, TeamModule],
  controllers: [GenerationController],
  providers: [GenerationService, MatchUtils],
  exports: [GenerationService],
})
export class GenerationModule {}
