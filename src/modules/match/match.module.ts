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

@Module({
    imports: [
      TypeOrmModule.forFeature([Match,Team, Tournament]), 
      forwardRef(() => TeamModule) ,
      forwardRef(() => EventDateModule)    ], 
  controllers: [MatchController],
  providers: [MatchService,MatchUtils],
  exports: [MatchService]
})
export class MatchModule {}
