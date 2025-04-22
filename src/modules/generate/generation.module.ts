import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { MatchModule } from '../match/match.module';
import { EventDateModule } from '../event-date/event-date.module';
import { TournamentModule } from '../tournament/tournament.module';
import { MatchUtils } from 'src/helper/match.utils';
import { TeamModule } from '../team/team.module';
import { MatchRepository } from '../match/match.repository';
import { Slot } from '../event-date/entities/slot.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [MatchModule, EventDateModule, TournamentModule, TeamModule, TypeOrmModule.forFeature([Slot])],
  controllers: [GenerationController],
  providers: [GenerationService, MatchUtils, MatchRepository],
  exports: [GenerationService],
})
export class GenerationModule {}
