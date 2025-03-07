import { forwardRef, Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { Team } from '../team/entities/team.entity';
import { Player } from './entities/player.entity';
import { TournamentModule } from '../tournament/tournament.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamModule } from '../team/team.module';
import { TeamRepository } from '../team/team.repository';

@Module({
    imports: [
      TypeOrmModule.forFeature([Player, Team]), 
    ], 
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerModule {}
