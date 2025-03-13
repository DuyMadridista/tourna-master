import { forwardRef, Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TournamentModule } from '../tournament/tournament.module';
import { MatchRepository } from '../match/match.repository';

@Module({
    imports: [
      TypeOrmModule.forFeature([Team]), 
      forwardRef(() => TournamentModule) 
    ], 
  controllers: [TeamController],
  providers: [TeamService,MatchRepository],
  exports: [TeamService]
})
export class TeamModule {}
