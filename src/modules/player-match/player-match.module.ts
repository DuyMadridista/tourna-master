import { Module } from '@nestjs/common';
import { PlayerMatchService } from './player-match.service';
import { PlayerMatchController } from './player-match.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerMatch } from './player-match.entity';
import { Player } from '../player/entities/player.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PlayerMatch,Player])],
  controllers: [PlayerMatchController],
  providers: [PlayerMatchService],
  exports: [PlayerMatchService],
})
export class PlayerMatchModule {}
